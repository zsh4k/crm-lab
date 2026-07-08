import { Hono } from "hono";
import { eq, ilike, desc } from "drizzle-orm";
import { db } from "../db/client";
import { companies } from "../db/schema";

const r = new Hono();

r.get("/", async (c) => {
  const q = c.req.query("q");
  const rows = q
    ? await db.select().from(companies).where(ilike(companies.name, `%${q}%`)).orderBy(companies.name)
    : await db.select().from(companies).orderBy(desc(companies.createdAt));
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [row] = await db.select().from(companies).where(eq(companies.id, c.req.param("id")));
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.name) return c.json({ error: "name es obligatorio" }, 400);
  const [row] = await db
    .insert(companies)
    .values({
      name: b.name,
      domain: b.domain ?? null,
      phone: b.phone ?? null,
      email: b.email ?? null,
      address: b.address ?? null,
      notes: b.notes ?? null,
    })
    .returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["name", "domain", "phone", "email", "address", "notes"]) if (k in b) patch[k] = b[k];
  const [row] = await db.update(companies).set(patch).where(eq(companies.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(companies).where(eq(companies.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
