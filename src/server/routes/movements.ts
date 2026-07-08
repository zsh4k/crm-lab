import { Hono } from "hono";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "../db/client";
import { inventoryMovements, products } from "../db/schema";

const r = new Hono();

const TYPES = ["in", "out", "adjust"] as const;
type MovType = (typeof TYPES)[number];

// GET /api/movements?productId= → ledger (últimos 100).
r.get("/", async (c) => {
  const productId = c.req.query("productId");
  const base = db.select().from(inventoryMovements);
  const rows = productId
    ? await base.where(eq(inventoryMovements.productId, productId)).orderBy(desc(inventoryMovements.createdAt)).limit(100)
    : await base.orderBy(desc(inventoryMovements.createdAt)).limit(100);
  return c.json(rows);
});

// POST /api/movements → registra movimiento y ajusta el stock del producto, atómico.
//   in     → stock += quantity
//   out    → stock -= quantity
//   adjust → stock  = quantity (set absoluto)
r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.productId || !TYPES.includes(b.type) || b.quantity == null) {
    return c.json({ error: "productId, type (in|out|adjust) y quantity son obligatorios" }, 400);
  }
  const type = b.type as MovType;
  const qty = Number(b.quantity);
  if (!Number.isFinite(qty) || qty < 0) return c.json({ error: "quantity inválida" }, 400);

  try {
    const result = await db.transaction(async (tx) => {
      const [prod] = await tx.select().from(products).where(eq(products.id, b.productId));
      if (!prod) throw new Error("producto no encontrado");

      let newStock: number;
      if (type === "in") newStock = prod.stock + qty;
      else if (type === "out") newStock = prod.stock - qty;
      else newStock = qty; // adjust

      if (newStock < 0) throw new Error("stock insuficiente");

      const [mov] = await tx
        .insert(inventoryMovements)
        .values({ productId: b.productId, type, quantity: qty, reason: b.reason ?? null, reference: b.reference ?? null })
        .returning();
      await tx.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, b.productId));
      return { movement: mov, stock: newStock };
    });
    return c.json(result, 201);
  } catch (e) {
    const msg = (e as Error).message;
    const code = msg.includes("insuficiente") || msg.includes("no encontrado") ? 400 : 500;
    return c.json({ error: msg }, code);
  }
});

export default r;
