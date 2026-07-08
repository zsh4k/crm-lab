import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { env, pushConfigured } from "../lib/env";
import { sendPush } from "../push/send";

const r = new Hono();

r.get("/vapid-public-key", (c) => c.text(env.vapid.publicKey));

r.get("/status", async (c) => {
  const subs = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions);
  return c.json({ configured: pushConfigured(), subscribed: subs.length > 0, count: subs.length });
});

r.post("/subscribe", async (c) => {
  const b = await c.req.json();
  if (!b?.endpoint || !b?.keys?.p256dh || !b?.keys?.auth) {
    return c.json({ error: "subscription inválida" }, 400);
  }
  const [existing] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, b.endpoint));
  if (!existing) {
    await db.insert(pushSubscriptions).values({
      endpoint: b.endpoint,
      p256dh: b.keys.p256dh,
      auth: b.keys.auth,
      platform: b.platform ?? null,
    });
  }
  return c.json({ ok: true });
});

r.post("/unsubscribe", async (c) => {
  const b = await c.req.json();
  if (b?.endpoint) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, b.endpoint));
  return c.json({ ok: true });
});

r.post("/test", async (c) => {
  if (!pushConfigured()) return c.json({ error: "Web Push no configurado (faltan VAPID)" }, 400);
  const res = await sendPush({ title: "CRM Fenix ✅", body: "Recordatorios activados 🎉", url: env.appBaseUrl });
  return c.json(res);
});

export default r;
