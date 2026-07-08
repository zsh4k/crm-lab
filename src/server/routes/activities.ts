import { Hono } from "hono";
import { and, eq, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { activities } from "../db/schema";

const r = new Hono();

const TYPES = ["note", "call", "email", "meeting", "whatsapp", "system"] as const;
type ActType = (typeof TYPES)[number];

// GET /api/activities?contactId= → timeline (más reciente primero)
r.get("/", async (c) => {
  const contactId = c.req.query("contactId");
  const conds: SQL[] = [];
  if (contactId) conds.push(eq(activities.contactId, contactId));
  const rows = await db
    .select()
    .from(activities)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(activities.createdAt))
    .limit(200);
  return c.json(rows);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.contactId || !b.body?.trim()) return c.json({ error: "contactId y body son obligatorios" }, 400);
  const type: ActType = TYPES.includes(b.type) ? b.type : "note";
  const [row] = await db.insert(activities).values({ contactId: b.contactId, type, body: b.body.trim() }).returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = {};
  if ("body" in b) patch.body = String(b.body).trim();
  if ("type" in b && (TYPES as readonly string[]).includes(b.type)) patch.type = b.type;
  if (Object.keys(patch).length === 0) return c.json({ error: "nada para actualizar" }, 400);
  const [row] = await db.update(activities).set(patch).where(eq(activities.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(activities).where(eq(activities.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
