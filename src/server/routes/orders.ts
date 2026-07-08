import { Hono } from "hono";
import { and, eq, desc, type SQL } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db/client";
import { orders, orderItems, products, inventoryMovements, activities } from "../db/schema";

const r = new Hono();

// Tipo de la transacción de drizzle (lo que recibe el callback de db.transaction).
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const STATUSES = ["quote", "confirmed", "fulfilled", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABEL: Record<Status, string> = {
  quote: "cotización",
  confirmed: "confirmado",
  fulfilled: "entregado",
  cancelled: "cancelado",
};

interface ItemInput {
  productId?: string | null;
  name?: string;
  quantity: number;
  unitPrice?: number | string;
}
interface ResolvedItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
}

function computeTotal(items: ResolvedItem[]): string {
  const cents = items.reduce((s, it) => s + Math.round(Number(it.unitPrice) * 100) * it.quantity, 0);
  return (cents / 100).toFixed(2);
}

// Resuelve los ítems crudos: snapshot de nombre/precio desde el producto si no se dieron.
async function loadItems(tx: Tx, raw: ItemInput[]): Promise<ResolvedItem[]> {
  const out: ResolvedItem[] = [];
  for (const it of raw) {
    const qty = Math.round(Number(it.quantity));
    if (!Number.isFinite(qty) || qty <= 0) throw new Error("cantidad inválida");
    let name = it.name ?? "Ítem";
    let unitPrice = it.unitPrice != null ? String(it.unitPrice) : "0";
    if (it.productId) {
      const [p] = await tx.select().from(products).where(eq(products.id, it.productId));
      if (!p) throw new Error("producto no encontrado");
      if (!it.name) name = p.name;
      if (it.unitPrice == null) unitPrice = p.price;
    }
    out.push({ productId: it.productId ?? null, name, quantity: qty, unitPrice });
  }
  return out;
}

// Mueve stock por los ítems de un pedido: "out" descuenta (entregar), "in" repone (cancelar/borrar).
async function moveStock(tx: Tx, items: ResolvedItem[], dir: "out" | "in", orderId: string): Promise<void> {
  for (const it of items) {
    if (!it.productId) continue;
    const [p] = await tx.select().from(products).where(eq(products.id, it.productId));
    if (!p) continue;
    const newStock = dir === "out" ? p.stock - it.quantity : p.stock + it.quantity;
    if (newStock < 0) throw new Error(`stock insuficiente para ${it.name}`);
    await tx.insert(inventoryMovements).values({
      productId: it.productId,
      type: dir,
      quantity: it.quantity,
      reason: dir === "out" ? "pedido entregado" : "pedido revertido",
      reference: orderId,
    });
    await tx.update(products).set({ stock: newStock, updatedAt: new Date() }).where(eq(products.id, it.productId));
  }
}

async function logActivity(tx: Tx, contactId: string | null, body: string): Promise<void> {
  if (!contactId) return;
  await tx.insert(activities).values({ contactId, type: "system", body });
}

function errResp(c: Context, e: unknown) {
  const msg = (e as Error).message;
  const code = /insuficiente|no encontrado|inválida|necesita/.test(msg) ? 400 : 500;
  return c.json({ error: msg }, code);
}

r.get("/", async (c) => {
  const contactId = c.req.query("contactId");
  const status = c.req.query("status");
  const conds: SQL[] = [];
  if (contactId) conds.push(eq(orders.contactId, contactId));
  if (status && (STATUSES as readonly string[]).includes(status)) conds.push(eq(orders.status, status as Status));
  const rows = await db
    .select()
    .from(orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(orders.createdAt));
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, c.req.param("id")));
  if (!order) return c.json({ error: "no encontrado" }, 404);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return c.json({ ...order, items });
});

r.post("/", async (c) => {
  const b = await c.req.json();
  const raw: ItemInput[] = Array.isArray(b.items) ? b.items : [];
  if (raw.length === 0) return c.json({ error: "el pedido necesita al menos un ítem" }, 400);
  const status: Status = STATUSES.includes(b.status) ? b.status : "quote";
  try {
    const result = await db.transaction(async (tx) => {
      const items = await loadItems(tx, raw);
      const total = computeTotal(items);
      const [order] = await tx
        .insert(orders)
        .values({
          contactId: b.contactId ?? null,
          companyId: b.companyId ?? null,
          status,
          currency: b.currency ?? "MXN",
          notes: b.notes ?? null,
          total,
        })
        .returning();
      await tx.insert(orderItems).values(items.map((it) => ({ ...it, orderId: order.id })));
      if (status === "fulfilled") {
        await moveStock(tx, items, "out", order.id);
        await tx.update(orders).set({ stockApplied: true }).where(eq(orders.id, order.id));
        order.stockApplied = true;
      }
      await logActivity(tx, order.contactId, `Pedido ${STATUS_LABEL[status]} · ${total} ${order.currency}`);
      return { ...order, items };
    });
    return c.json(result, 201);
  } catch (e) {
    return errResp(c, e);
  }
});

r.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json();
  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id));
      if (!order) throw new Error("no encontrado");
      const current = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));

      // 1) Si ya tenía stock aplicado, revertir SIEMPRE antes de re-evaluar.
      if (order.stockApplied) {
        await moveStock(tx, current as ResolvedItem[], "in", id);
        await tx.update(orders).set({ stockApplied: false }).where(eq(orders.id, id));
        order.stockApplied = false;
      }

      // 2) Reemplazo de ítems (opcional).
      let items: ResolvedItem[] = current as ResolvedItem[];
      let total = order.total;
      if (Array.isArray(b.items)) {
        if (b.items.length === 0) throw new Error("el pedido necesita al menos un ítem");
        items = await loadItems(tx, b.items);
        total = computeTotal(items);
        await tx.delete(orderItems).where(eq(orderItems.orderId, id));
        await tx.insert(orderItems).values(items.map((it) => ({ ...it, orderId: id })));
      }

      // 3) Estado final + re-aplicar stock si queda "fulfilled".
      const finalStatus: Status = STATUSES.includes(b.status) ? b.status : (order.status as Status);
      let stockApplied = false;
      if (finalStatus === "fulfilled") {
        await moveStock(tx, items, "out", id);
        stockApplied = true;
      }

      const patch: Record<string, unknown> = { status: finalStatus, total, stockApplied, updatedAt: new Date() };
      if ("notes" in b) patch.notes = b.notes;
      if ("currency" in b) patch.currency = b.currency;
      if ("contactId" in b) patch.contactId = b.contactId ?? null;
      const [updated] = await tx.update(orders).set(patch).where(eq(orders.id, id)).returning();
      if (finalStatus !== order.status) {
        await logActivity(tx, updated.contactId, `Pedido → ${STATUS_LABEL[finalStatus]} · ${total} ${updated.currency}`);
      }
      return { ...updated, items };
    });
    return c.json(result);
  } catch (e) {
    return errResp(c, e);
  }
});

r.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id));
      if (!order) return;
      if (order.stockApplied) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
        await moveStock(tx, items as ResolvedItem[], "in", id);
      }
      await tx.delete(orders).where(eq(orders.id, id)); // order_items en cascada
    });
    return c.json({ ok: true });
  } catch (e) {
    return errResp(c, e);
  }
});

export default r;
