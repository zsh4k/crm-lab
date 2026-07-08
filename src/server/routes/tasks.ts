import { Hono } from "hono";
import { and, eq, asc, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { tasks } from "../db/schema";

const r = new Hono();

// GET /api/tasks?contactId=&done=true|false → pendientes primero, por vencimiento.
r.get("/", async (c) => {
  const contactId = c.req.query("contactId");
  const done = c.req.query("done");
  const conds: SQL[] = [];
  if (contactId) conds.push(eq(tasks.contactId, contactId));
  if (done === "true") conds.push(eq(tasks.done, true));
  if (done === "false") conds.push(eq(tasks.done, false));
  const rows = await db
    .select()
    .from(tasks)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(tasks.done), asc(tasks.dueAt), desc(tasks.createdAt));
  return c.json(rows);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.title?.trim()) return c.json({ error: "title es obligatorio" }, 400);
  const done = !!b.done;
  const [row] = await db
    .insert(tasks)
    .values({
      contactId: b.contactId ?? null,
      title: b.title.trim(),
      dueAt: b.dueAt ? new Date(b.dueAt) : null,
      done,
      completedAt: done ? new Date() : null,
    })
    .returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if ("title" in b) patch.title = String(b.title).trim();
  if ("contactId" in b) patch.contactId = b.contactId ?? null;
  if ("dueAt" in b) patch.dueAt = b.dueAt ? new Date(b.dueAt) : null;
  if ("done" in b) {
    patch.done = !!b.done;
    patch.completedAt = b.done ? new Date() : null;
  }
  const [row] = await db.update(tasks).set(patch).where(eq(tasks.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(tasks).where(eq(tasks.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
