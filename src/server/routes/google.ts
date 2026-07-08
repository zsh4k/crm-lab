import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "../db/client";
import { googleAccounts, events, syncLog } from "../db/schema";
import { env, googleConfigured } from "../lib/env";
import { encrypt, decrypt } from "../lib/crypto";
import { buildAuthUrl, exchangeCode, fetchUserEmail, revokeToken } from "../google/oauth";
import { runSyncOnce } from "../sync/worker";

const r = new Hono();

// Store de `state` en memoria para prevenir CSRF (TTL 10 min).
const states = new Map<string, number>();
function newState(): string {
  const s = randomBytes(16).toString("hex");
  states.set(s, Date.now() + 10 * 60_000);
  return s;
}
function consumeState(s: string | undefined): boolean {
  if (!s) return false;
  const exp = states.get(s);
  states.delete(s);
  return Boolean(exp && exp > Date.now());
}

// GET /api/google/status → si las credenciales están configuradas + cuentas conectadas.
r.get("/status", async (c) => {
  const accounts = await db
    .select({
      id: googleAccounts.id,
      email: googleAccounts.email,
      calendarId: googleAccounts.calendarId,
      syncEnabled: googleAccounts.syncEnabled,
      lastSyncAt: googleAccounts.lastSyncAt,
      lastSyncStatus: googleAccounts.lastSyncStatus,
    })
    .from(googleAccounts);
  return c.json({ configured: googleConfigured(), connected: accounts.length > 0, accounts });
});

// GET /api/google/authorize → redirige al consentimiento de Google.
r.get("/authorize", (c) => {
  if (!googleConfigured()) {
    return c.json(
      {
        error: "Google OAuth no configurado",
        hint: "Define GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REDIRECT_URI en el .env.",
      },
      400,
    );
  }
  return c.redirect(buildAuthUrl(newState()));
});

// GET /api/google/callback → Google nos devuelve el `code`; lo canjeamos por tokens.
r.get("/callback", async (c) => {
  const { code, state, error } = c.req.query();
  const back = (q: string) => c.redirect(`${env.appBaseUrl}/?${q}`);

  if (error) return back(`google=error&msg=${encodeURIComponent(error)}`);
  if (!consumeState(state)) return back("google=error&msg=state_invalido");
  if (!code) return back("google=error&msg=sin_code");

  try {
    const tok = await exchangeCode(code);
    const email = await fetchUserEmail(tok.access_token);
    const expiry = new Date(Date.now() + tok.expires_in * 1000);

    const [existing] = await db.select().from(googleAccounts).where(eq(googleAccounts.email, email));

    if (existing) {
      await db
        .update(googleAccounts)
        .set({
          accessTokenEnc: encrypt(tok.access_token),
          // Google solo manda refresh_token la primera vez; conservamos el viejo si no llega.
          ...(tok.refresh_token ? { refreshTokenEnc: encrypt(tok.refresh_token) } : {}),
          tokenExpiry: expiry,
          scope: tok.scope,
          updatedAt: new Date(),
        })
        .where(eq(googleAccounts.id, existing.id));
    } else {
      if (!tok.refresh_token) {
        // Sin refresh_token no podemos mantener el acceso; pedimos re-consentir.
        return back("google=error&msg=sin_refresh_token_revoca_y_reintenta");
      }
      await db.insert(googleAccounts).values({
        email,
        accessTokenEnc: encrypt(tok.access_token),
        refreshTokenEnc: encrypt(tok.refresh_token),
        tokenExpiry: expiry,
        scope: tok.scope,
      });
    }
    return back("google=connected");
  } catch (e) {
    return back(`google=error&msg=${encodeURIComponent(String(e))}`);
  }
});

// POST /api/google/disconnect/:id → revoca y desvincula la cuenta.
r.post("/disconnect/:id", async (c) => {
  const id = c.req.param("id");
  const [acc] = await db.select().from(googleAccounts).where(eq(googleAccounts.id, id));
  if (!acc) return c.json({ error: "no encontrada" }, 404);

  try {
    await revokeToken(decrypt(acc.refreshTokenEnc));
  } catch {
    /* la revocación es best-effort */
  }
  // Desvinculamos los eventos (no los borramos) y eliminamos la cuenta.
  await db.update(events).set({ googleAccountId: null }).where(eq(events.googleAccountId, id));
  await db.delete(googleAccounts).where(eq(googleAccounts.id, id));
  return c.json({ ok: true });
});

// POST /api/google/sync → dispara un ciclo de sync manual (no bloquea).
r.post("/sync", (c) => {
  if (!googleConfigured()) return c.json({ error: "Google OAuth no configurado" }, 400);
  runSyncOnce().catch((e) => console.error("[sync] manual falló:", e));
  return c.json({ ok: true, triggered: true });
});

// GET /api/google/sync/log → últimas 50 entradas de auditoría de sync.
r.get("/sync/log", async (c) => {
  const rows = await db.select().from(syncLog).orderBy(desc(syncLog.createdAt)).limit(50);
  return c.json(rows);
});

export default r;
