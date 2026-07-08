import { Hono } from "hono";
import { and, gte, lte, eq } from "drizzle-orm";
import { db } from "../db/client";
import { events } from "../db/schema";

const r = new Hono();

// GET /api/events?from=ISO&to=ISO  → eventos no borrados en el rango.
r.get("/", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const conds = [eq(events.deleted, false)];
  if (from) conds.push(gte(events.startAt, new Date(from)));
  if (to) conds.push(lte(events.startAt, new Date(to)));
  const rows = await db
    .select()
    .from(events)
    .where(and(...conds))
    .orderBy(events.startAt);
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [row] = await db.select().from(events).where(eq(events.id, c.req.param("id")));
  if (!row) return c.json({ error: "no encontrado" }, 404);
  return c.json(row);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.title || !b.startAt || !b.endAt) {
    return c.json({ error: "title, startAt y endAt son obligatorios" }, 400);
  }
  const [row] = await db
    .insert(events)
    .values({
      title: b.title,
      description: b.description ?? null,
      location: b.location ?? null,
      startAt: new Date(b.startAt),
      endAt: new Date(b.endAt),
      allDay: b.allDay ?? false,
      color: b.color ?? null,
      contactId: b.contactId ?? null,
      companyId: b.companyId ?? null,
      opportunityId: b.opportunityId ?? null,
      syncStatus: "local",
    })
    .returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json();
  const [current] = await db.select().from(events).where(eq(events.id, id));
  if (!current) return c.json({ error: "no encontrado" }, 404);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["title", "description", "location", "allDay", "color", "contactId", "companyId", "opportunityId"]) {
    if (k in b) patch[k] = b[k];
  }
  if ("startAt" in b) patch.startAt = new Date(b.startAt);
  if ("endAt" in b) patch.endAt = new Date(b.endAt);

  // Si ya está vinculado a Google, marcamos pending para re-empujar el cambio.
  if (current.googleEventId) patch.syncStatus = "pending";

  const [row] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
  return c.json(row);
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [current] = await db.select().from(events).where(eq(events.id, id));
  if (!current) return c.json({ error: "no encontrado" }, 404);

  if (current.googleEventId) {
    // Soft-delete: el worker de sync lo borrará también en Google.
    await db
      .update(events)
      .set({ deleted: true, syncStatus: "pending", updatedAt: new Date() })
      .where(eq(events.id, id));
  } else {
    await db.delete(events).where(eq(events.id, id));
  }
  return c.json({ ok: true });
});

export default r;
