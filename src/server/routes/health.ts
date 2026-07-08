import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../db/client";

const health = new Hono();

health.get("/", async (c) => {
  let dbOk = false;
  try {
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return c.json(
    { ok: dbOk, service: "crm", db: dbOk, time: new Date().toISOString() },
    dbOk ? 200 : 503,
  );
});

export default health;
