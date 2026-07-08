import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { categories } from "../db/schema";

const r = new Hono();

r.get("/", async (c) => c.json(await db.select().from(categories).orderBy(categories.name)));

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "name es obligatorio" }, 400);
  const [row] = await db.insert(categories).values({ name: b.name, description: b.description ?? null }).returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "description"]) if (k in b) patch[k] = b[k];
  const [row] = await db.update(categories).set(patch).where(eq(categories.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(categories).where(eq(categories.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
