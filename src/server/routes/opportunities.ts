import { Hono } from "hono";
import { and, eq, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { opportunities } from "../db/schema";

const r = new Hono();

const STATUSES = ["open", "won", "lost"] as const;
type Status = (typeof STATUSES)[number];

r.get("/", async (c) => {
  const status = c.req.query("status");
  const contactId = c.req.query("contactId");
  const conds: SQL[] = [];
  if (status && (STATUSES as readonly string[]).includes(status)) conds.push(eq(opportunities.status, status as Status));
  if (contactId) conds.push(eq(opportunities.contactId, contactId));
  const rows = await db
    .select()
    .from(opportunities)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(opportunities.createdAt));
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [row] = await db.select().from(opportunities).where(eq(opportunities.id, c.req.param("id")));
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.title) return c.json({ error: "title es obligatorio" }, 400);
  const [row] = await db
    .insert(opportunities)
    .values({
      contactId: b.contactId ?? null,
      companyId: b.companyId ?? null,
      title: b.title,
      amount: b.amount != null ? String(b.amount) : "0",
      currency: b.currency ?? "MXN",
      status: STATUSES.includes(b.status) ? b.status : "open",
      stage: b.stage ?? "nuevo",
      expectedCloseAt: b.expectedCloseAt ? new Date(b.expectedCloseAt) : null,
    })
    .returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const b = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["contactId", "companyId", "title", "currency", "status", "stage"]) if (k in b) patch[k] = b[k];
  if ("amount" in b) patch.amount = String(b.amount);
  if ("expectedCloseAt" in b) patch.expectedCloseAt = b.expectedCloseAt ? new Date(b.expectedCloseAt) : null;
  const [row] = await db.update(opportunities).set(patch).where(eq(opportunities.id, c.req.param("id"))).returning();
  return row ? c.json(row) : c.json({ error: "no encontrada" }, 404);
});

r.delete("/:id", async (c) => {
  await db.delete(opportunities).where(eq(opportunities.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
