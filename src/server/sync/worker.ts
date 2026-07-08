import { env, googleConfigured } from "../lib/env";
import { syncAllAccounts } from "../google/sync";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

// Ejecuta un ciclo de sync evitando solapamientos.
export async function runSyncOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await syncAllAccounts();
  } finally {
    running = false;
  }
}

// Arranca el polling. No-op si Google no está configurado.
export function startSyncWorker(): void {
  if (!googleConfigured()) {
    console.log("[sync] worker inactivo (Google OAuth no configurado)");
    return;
  }
  if (timer) return;
  console.log(`[sync] worker activo cada ${env.syncPollIntervalMs}ms`);
  timer = setInterval(() => {
    runSyncOnce().catch((e) => console.error("[sync] ciclo falló:", e));
  }, env.syncPollIntervalMs);
  // Primer ciclo a los 5s del arranque.
  setTimeout(() => runSyncOnce().catch(() => {}), 5000);
}
