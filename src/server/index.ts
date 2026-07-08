import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { env } from "./lib/env";
import { startSyncWorker } from "./sync/worker";
import { startReminderWorker } from "./push/reminders";
import health from "./routes/health";
import events from "./routes/events";
import google from "./routes/google";
import contacts from "./routes/contacts";
import companies from "./routes/companies";
import opportunities from "./routes/opportunities";
import categories from "./routes/categories";
import products from "./routes/products";
import movements from "./routes/movements";
import orders from "./routes/orders";
import activities from "./routes/activities";
import tasks from "./routes/tasks";
import push from "./routes/push";

const app = new Hono();
app.use("*", logger());

// ── API ────────────────────────────────────────────────────
app.route("/api/health", health);
app.route("/api/events", events);
app.route("/api/google", google);
app.route("/api/contacts", contacts);
app.route("/api/companies", companies);
app.route("/api/opportunities", opportunities);
app.route("/api/categories", categories);
app.route("/api/products", products);
app.route("/api/movements", movements);
app.route("/api/orders", orders);
app.route("/api/activities", activities);
app.route("/api/tasks", tasks);
app.route("/api/push", push);

// ── SPA (build de Vite en ./dist) ──────────────────────────
app.use("/*", serveStatic({ root: "./dist" }));
app.get("*", async (c) => {
  const index = Bun.file("./dist/index.html");
  if (await index.exists()) return c.html(await index.text());
  return c.text("CRM API arriba. Frontend sin construir (corré `bun run build`).");
});

// Workers: sync con Google (no-op sin OAuth) + recordatorios push (no-op sin VAPID).
startSyncWorker();
startReminderWorker();

console.log(`[crm] escuchando en http://0.0.0.0:${env.port}`);

export default { port: env.port, hostname: "0.0.0.0", fetch: app.fetch };
