import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { pushSubscriptions } from "../db/schema";
import { env, pushConfigured } from "../lib/env";

let ready = false;
function ensure() {
  if (!ready && pushConfigured()) {
    webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
    ready = true;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Envía a todas las suscripciones. Limpia las que Apple/FCM reportan como muertas (404/410).
export async function sendPush(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  ensure();
  if (!pushConfigured()) return { sent: 0, failed: 0 };
  const subs = await db.select().from(pushSubscriptions);
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      failed++;
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
      }
    }
  }
  return { sent, failed };
}
