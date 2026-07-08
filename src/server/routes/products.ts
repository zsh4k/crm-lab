import { Hono } from "hono";
import { and, eq, ilike, lte, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { products } from "../db/schema";

const r = new Hono();

r.get("/", async (c) => {
  const q = c.req.query("q");
  const categoryId = c.req.query("categoryId");
  const lowStock = c.req.query("lowStock") === "1";
  const conds: SQL[] = [];
  if (q) conds.push(ilike(products.name, `%${q}%`));
  if (categoryId) conds.push(eq(products.categoryId, categoryId));
  if (lowStock) conds.push(lte(products.stock, products.minStock));
  const rows = await db
    .select()
    .from(products)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(products.createdAt));
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [row] = await db.select().from(products).where(eq(products.id, c.req.param("id")));
  return row ? c.json(row) : c.json({ error: "no encontrado" }, 404);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.sku || !b.name) return c.json({ error: "sku y name son obligatorios" }, 400);
  try {
    const [row] = await db
      .insert(products)
      .values({
        sku: b.sku,
        name: b.name,
        description: b.description ?? null,
        categoryId: b.categoryId ?? null,
        price: b.price != null ? String(b.price) : "0",
        cost: b.cost != null ? String(b.cost) : "0",
        stock: Number(b.stock ?? 0),
        minStock: Number(b.minStock ?? 0),
        unit: b.unit ?? "pza",
        active: b.active ?? true,
      })
      .returning();
    return c.json(row, 201);
  } catch (e) {
    // colisión de SKU (unique) u otro error de constraint.
    return c.json({ error: `no se pudo crear: ${String(e).includes("products_sku_idx") ? "SKU duplicado" : e}` }, 409);
  }
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["sku", "name", "description", "categoryId", "unit", "active"]) if (k in b) patch[k] = b[k];
  for (const k of ["price", "cost"]) if (k in b) patch[k] = String(b[k]);
  for (const k of ["minStock"]) if (k in b) patch[k] = Number(b[k]);
  // Ojo: el stock NO se edita acá, sólo vía movimientos (ledger).
  const [row] = await db.update(products).set(patch).where(eq(products.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrado" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(products).where(eq(products.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
