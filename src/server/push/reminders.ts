import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { events } from "../db/schema";
import { env, pushConfigured } from "../lib/env";
import { sendPush } from "./send";

let timer: ReturnType<typeof setInterval> | null = null;

const fmt = (d: Date) => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

// Empuja un recordatorio por cada evento que arranca dentro de la ventana de
// anticipación y todavía no fue notificado.
export async function checkReminders(): Promise<void> {
  if (!pushConfigured()) return;
  const now = new Date();
  const soon = new Date(now.getTime() + env.reminderLeadMin * 60_000);
  const due = await db
    .select()
    .from(events)
    .where(and(eq(events.deleted, false), isNull(events.remindedAt), gte(events.startAt, now), lte(events.startAt, soon)));

  for (const e of due) {
    await sendPush({
      title: `⏰ ${e.title}`,
      body: `Empieza ${fmt(new Date(e.startAt))}${e.location ? ` · ${e.location}` : ""}`,
      url: `${env.appBaseUrl}/#agenda`,
      tag: `ev-${e.id}`,
    });
    await db.update(events).set({ remindedAt: new Date() }).where(eq(events.id, e.id));
  }
}

export function startReminderWorker(): void {
  if (!pushConfigured()) {
    console.log("[push] worker de recordatorios inactivo (VAPID no configurado)");
    return;
  }
  if (timer) return;
  console.log(`[push] recordatorios activos (anticipación ${env.reminderLeadMin} min)`);
  timer = setInterval(() => {
    checkReminders().catch((e) => console.error("[push] reminder falló:", e));
  }, 60_000);
}
