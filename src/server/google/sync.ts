import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { events, googleAccounts, syncLog } from "../db/schema";
import { getValidAccessToken } from "./tokens";
import { listEvents, insertEvent, updateEvent, deleteEvent, type GCalEvent } from "./calendar";

type EventRow = typeof events.$inferSelect;
type Account = typeof googleAccounts.$inferSelect;

const TZ = "America/Mexico_City";

// ── Mapping puro (exportado para tests) ────────────────────
export function toGoogle(ev: Pick<EventRow, "title" | "description" | "location" | "startAt" | "endAt" | "allDay">): GCalEvent {
  const base: GCalEvent = {
    summary: ev.title,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
  };
  if (ev.allDay) {
    const d = (x: Date) => x.toISOString().slice(0, 10);
    base.start = { date: d(ev.startAt) };
    base.end = { date: d(ev.endAt) };
  } else {
    base.start = { dateTime: ev.startAt.toISOString(), timeZone: TZ };
    base.end = { dateTime: ev.endAt.toISOString(), timeZone: TZ };
  }
  return base;
}

export function fromGoogle(g: GCalEvent): {
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
} {
  const allDay = Boolean(g.start?.date);
  const startAt = new Date(g.start?.dateTime ?? g.start?.date ?? Date.now());
  const endAt = new Date(g.end?.dateTime ?? g.end?.date ?? startAt.toISOString());
  return {
    title: g.summary ?? "(sin título)",
    description: g.description ?? null,
    location: g.location ?? null,
    startAt,
    endAt,
    allDay,
  };
}

// ── Log de sync ────────────────────────────────────────────
async function log(
  accountId: string,
  direction: "inbound" | "outbound",
  action: string,
  extra: { eventId?: string; googleEventId?: string; detail?: unknown } = {},
) {
  await db.insert(syncLog).values({
    googleAccountId: accountId,
    direction,
    action,
    eventId: extra.eventId ?? null,
    googleEventId: extra.googleEventId ?? null,
    detail: (extra.detail ?? null) as object | null,
  });
}

// ── Push: sube los eventos locales pendientes a Google ─────
async function pushLocal(account: Account, token: string): Promise<number> {
  const calId = account.calendarId;
  const pending = await db
    .select()
    .from(events)
    .where(inArray(events.syncStatus, ["local", "pending"]));
  let n = 0;
  for (const ev of pending) {
    try {
      if (ev.deleted) {
        if (ev.googleEventId) await deleteEvent(token, calId, ev.googleEventId);
        await db.delete(events).where(eq(events.id, ev.id));
        await log(account.id, "outbound", "delete", { eventId: ev.id, googleEventId: ev.googleEventId ?? undefined });
      } else if (ev.googleEventId) {
        const g = await updateEvent(token, calId, ev.googleEventId, toGoogle(ev));
        await db
          .update(events)
          .set({ etag: g.etag ?? null, syncStatus: "synced", syncedAt: new Date(), googleAccountId: account.id, googleCalendarId: calId })
          .where(eq(events.id, ev.id));
        await log(account.id, "outbound", "update", { eventId: ev.id, googleEventId: ev.googleEventId });
      } else {
        const g = await insertEvent(token, calId, toGoogle(ev));
        await db
          .update(events)
          .set({ googleEventId: g.id ?? null, etag: g.etag ?? null, syncStatus: "synced", syncedAt: new Date(), googleAccountId: account.id, googleCalendarId: calId })
          .where(eq(events.id, ev.id));
        await log(account.id, "outbound", "insert", { eventId: ev.id, googleEventId: g.id });
      }
      n++;
    } catch (e) {
      await db.update(events).set({ syncStatus: "error" }).where(eq(events.id, ev.id));
      await log(account.id, "outbound", "error", { eventId: ev.id, detail: String(e) });
    }
  }
  return n;
}

// ── Pull: trae los cambios de Google al CRM (incremental) ──
async function pullRemote(account: Account, token: string, allowResync = true): Promise<number> {
  const calId = account.calendarId;
  let pageToken: string | undefined;
  let syncToken: string | undefined = account.syncToken ?? undefined;
  let newSyncToken: string | undefined;
  let n = 0;

  // Sin syncToken: full sync acotado a -90 días para no traer historia infinita.
  const timeMin = syncToken ? undefined : new Date(Date.now() - 90 * 86_400_000).toISOString();

  for (;;) {
    const r = await listEvents(token, calId, { syncToken, pageToken, timeMin });
    if (r.gone) {
      // syncToken expirado → reset + full resync una vez.
      await db.update(googleAccounts).set({ syncToken: null }).where(eq(googleAccounts.id, account.id));
      if (!allowResync) throw new Error("syncToken inválido tras reset");
      return pullRemote({ ...account, syncToken: null }, token, false);
    }
    for (const g of r.items) {
      if (!g.id) continue;
      const [local] = await db.select().from(events).where(eq(events.googleEventId, g.id));
      if (g.status === "cancelled") {
        if (local) {
          await db.delete(events).where(eq(events.id, local.id));
          await log(account.id, "inbound", "delete", { eventId: local.id, googleEventId: g.id });
          n++;
        }
        continue;
      }
      const mapped = fromGoogle(g);
      if (!local) {
        const [ins] = await db
          .insert(events)
          .values({ ...mapped, googleAccountId: account.id, googleEventId: g.id, googleCalendarId: calId, etag: g.etag ?? null, syncStatus: "synced", syncedAt: new Date() })
          .returning();
        await log(account.id, "inbound", "insert", { eventId: ins.id, googleEventId: g.id });
      } else {
        await db
          .update(events)
          .set({ ...mapped, etag: g.etag ?? null, syncStatus: "synced", syncedAt: new Date(), updatedAt: new Date() })
          .where(eq(events.id, local.id));
        await log(account.id, "inbound", "update", { eventId: local.id, googleEventId: g.id });
      }
      n++;
    }
    if (r.nextPageToken) {
      pageToken = r.nextPageToken;
      continue;
    }
    newSyncToken = r.nextSyncToken;
    break;
  }

  await db
    .update(googleAccounts)
    .set({ syncToken: newSyncToken ?? account.syncToken, lastSyncAt: new Date(), lastSyncStatus: "ok" })
    .where(eq(googleAccounts.id, account.id));
  return n;
}

// ── Orquestación ───────────────────────────────────────────
export async function syncAccount(account: Account): Promise<{ pushed: number; pulled: number }> {
  const token = await getValidAccessToken(account);
  // Push primero (sube cambios locales), luego pull (trae el resto). Last-write-wins.
  const pushed = await pushLocal(account, token);
  const pulled = await pullRemote(account, token);
  return { pushed, pulled };
}

export async function syncAllAccounts(): Promise<void> {
  const accounts = await db.select().from(googleAccounts).where(eq(googleAccounts.syncEnabled, true));
  for (const acc of accounts) {
    try {
      const r = await syncAccount(acc);
      console.log(`[sync] ${acc.email}: ↑${r.pushed} ↓${r.pulled}`);
    } catch (e) {
      console.error(`[sync] ${acc.email} falló:`, (e as Error).message);
      await db.update(googleAccounts).set({ lastSyncStatus: `error: ${(e as Error).message}`, lastSyncAt: new Date() }).where(eq(googleAccounts.id, acc.id));
    }
  }
}
