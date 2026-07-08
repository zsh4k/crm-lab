import { Hono } from "hono";
import { and, eq, ilike, desc, type SQL } from "drizzle-orm";
import { db } from "../db/client";
import { contacts, activities } from "../db/schema";

const r = new Hono();

const STAGES = ["lead", "prospect", "customer", "inactive"] as const;
type Stage = (typeof STAGES)[number];
const STAGE_LABEL: Record<Stage, string> = { lead: "Lead", prospect: "Prospecto", customer: "Cliente", inactive: "Inactivo" };

r.get("/", async (c) => {
  const stage = c.req.query("stage");
  const companyId = c.req.query("companyId");
  const q = c.req.query("q");
  const conds: SQL[] = [];
  if (stage && (STAGES as readonly string[]).includes(stage)) conds.push(eq(contacts.stage, stage as Stage));
  if (companyId) conds.push(eq(contacts.companyId, companyId));
  if (q) conds.push(ilike(contacts.firstName, `%${q}%`));
  const rows = await db
    .select()
    .from(contacts)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(contacts.createdAt));
  return c.json(rows);
});

r.get("/:id", async (c) => {
  const [row] = await db.select().from(contacts).where(eq(contacts.id, c.req.param("id")));
  return row ? c.json(row) : c.json({ error: "no encontrado" }, 404);
});

r.post("/", async (c) => {
  const b = await c.req.json();
  if (!b.firstName) return c.json({ error: "firstName es obligatorio" }, 400);
  const [row] = await db
    .insert(contacts)
    .values({
      companyId: b.companyId ?? null,
      firstName: b.firstName,
      lastName: b.lastName ?? null,
      email: b.email ?? null,
      phone: b.phone ?? null,
      title: b.title ?? null,
      stage: STAGES.includes(b.stage) ? b.stage : "lead",
      source: b.source ?? null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      notes: b.notes ?? null,
    })
    .returning();
  return c.json(row, 201);
});

r.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const b = await c.req.json();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of ["companyId", "firstName", "lastName", "email", "phone", "title", "stage", "source", "tags", "notes"]) {
    if (k in b) patch[k] = b[k];
  }
  // Detectar cambio de etapa para registrarlo en el timeline.
  let prevStage: string | undefined;
  if (typeof patch.stage === "string") {
    const [prev] = await db.select({ stage: contacts.stage }).from(contacts).where(eq(contacts.id, id));
    prevStage = prev?.stage;
  }
  const [row] = await db.update(contacts).set(patch).where(eq(contacts.id, id)).returning();
  if (!row) return c.json({ error: "no encontrado" }, 404);
  if (prevStage && prevStage !== row.stage) {
    const from = STAGE_LABEL[prevStage as Stage] ?? prevStage;
    const to = STAGE_LABEL[row.stage as Stage] ?? row.stage;
    await db.insert(activities).values({ contactId: id, type: "system", body: `Etapa: ${from} → ${to}` });
  }
  return c.json(row);
});

r.delete("/:id", async (c) => {
  await db.delete(contacts).where(eq(contacts.id, c.req.param("id")));
  return c.json({ ok: true });
});

export default r;
