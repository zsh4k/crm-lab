/**
 * Capa de API SIMULADA para la demo estática (GitHub Pages).
 *
 * El CRM real habla con un backend Bun+Hono+Postgres vía `fetch('/api/...')`.
 * En Pages no hay servidor, así que este módulo intercepta `window.fetch`
 * para las rutas `/api/*` y las resuelve contra un store en memoria sembrado
 * con datos de ejemplo (persistido en localStorage). El resto del frontend
 * funciona sin modificaciones: es el mismo `lib.ts` real.
 *
 * Se importa PRIMERO en main.tsx para que el parche esté activo antes de que
 * cualquier vista pida datos.
 */

const STORE_KEY = "crm-demo-store-v3";
const uuid = () => (crypto.randomUUID?.() ?? "id-" + Math.random().toString(36).slice(2));
const nowISO = () => new Date().toISOString();

// Fechas relativas a HOY para que Inicio/Agenda muestren contenido vivo.
const day = (offset: number, h = 9, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

type Row = Record<string, any>;
interface Store {
  companies: Row[];
  contacts: Row[];
  opportunities: Row[];
  categories: Row[];
  products: Row[];
  movements: Row[];
  orders: Row[];
  activities: Row[];
  tasks: Row[];
  events: Row[];
}

function seed(): Store {
  const co = (name: string, extra: Row = {}): Row => ({
    id: uuid(), name, domain: null, phone: null, email: null, address: null,
    notes: null, createdAt: nowISO(), ...extra,
  });
  const companies = [
    co("Nébula Studios", { domain: "nebula.mx", email: "hola@nebula.mx", phone: "+52 614 123 4567" }),
    co("Ferretería del Norte", { domain: "ferrenorte.mx", phone: "+52 656 987 6543" }),
    co("Clínica Aurora", { domain: "aurora-salud.mx", email: "citas@aurora-salud.mx" }),
    co("TechBodega", { domain: "techbodega.io" }),
    co("Café Satori", { domain: "cafesatori.mx" }),
  ];
  const cid = (i: number) => companies[i].id;

  const mkContact = (
    firstName: string, lastName: string, stage: string, companyIdx: number | null,
    title: string, tags: string[], extra: Row = {}
  ): Row => ({
    id: uuid(), companyId: companyIdx == null ? null : cid(companyIdx),
    firstName, lastName, email: `${firstName.toLowerCase()}@example.mx`,
    phone: "+52 55 " + Math.floor(1000 + Math.random() * 8999) + " " + Math.floor(1000 + Math.random() * 8999),
    title, stage, source: "demo", tags, notes: null, createdAt: nowISO(), ...extra,
  });
  const contacts = [
    mkContact("Valeria", "Méndez", "customer", 0, "Directora Creativa", ["VIP", "diseño"]),
    mkContact("Diego", "López", "customer", 1, "Gerente de Compras", ["mayoreo"]),
    mkContact("Fernanda", "Ruiz", "prospect", 2, "Administradora", ["salud"]),
    mkContact("Andrés", "Castillo", "prospect", 3, "CTO", ["tech", "urgente"]),
    mkContact("Sofía", "Herrera", "lead", 4, "Dueña", ["café"]),
    mkContact("Mateo", "Jiménez", "lead", null, "Freelancer", ["referido"]),
    mkContact("Camila", "Torres", "prospect", 0, "Coordinadora", ["diseño"]),
    mkContact("Ricardo", "Vega", "customer", 3, "Head of Ops", ["tech", "VIP"]),
    mkContact("Lucía", "Navarro", "lead", null, "Emprendedora", []),
    mkContact("Emiliano", "Ríos", "prospect", 1, "Almacén", ["mayoreo"]),
  ];
  const ctId = (i: number) => contacts[i].id;

  const opp = (title: string, ci: number, amount: number, status: string, stage: string, closeOffset: number): Row => ({
    id: uuid(), contactId: ctId(ci), companyId: contacts[ci].companyId,
    title, amount: amount.toFixed(2), currency: "MXN", status, stage,
    expectedCloseAt: day(closeOffset, 12), createdAt: nowISO(),
  });
  const opportunities = [
    opp("Rediseño de marca", 0, 85000, "open", "propuesta", 10),
    opp("Pedido mayoreo Q3", 1, 240000, "open", "negociación", 4),
    opp("Sistema de citas", 2, 60000, "open", "calificado", 20),
    opp("Migración cloud", 3, 150000, "open", "propuesta", 15),
    opp("Branding cafetería", 4, 30000, "open", "nuevo", 30),
    opp("Soporte anual TI", 7, 120000, "won", "ganado", -5),
    opp("Landing express", 5, 18000, "lost", "perdido", -10),
  ];

  const categories = [
    { id: uuid(), name: "Electrónica", description: "Componentes y gadgets" },
    { id: uuid(), name: "Papelería", description: "Oficina y escolar" },
    { id: uuid(), name: "Herramientas", description: "Ferretería" },
    { id: uuid(), name: "Consumibles", description: "Rotación rápida" },
  ];
  const catId = (i: number) => categories[i].id;

  const prod = (sku: string, name: string, ci: number, price: number, cost: number, stock: number, minStock: number, unit = "pza"): Row => ({
    id: uuid(), sku, name, description: null, categoryId: catId(ci),
    price: price.toFixed(2), cost: cost.toFixed(2), stock, minStock, unit,
    active: true, createdAt: nowISO(),
  });
  const products = [
    prod("ELEC-001", "Teclado mecánico RGB", 0, 899, 520, 34, 10),
    prod("ELEC-002", "Mouse inalámbrico Pro", 0, 549, 300, 8, 12),          // low stock
    prod("ELEC-003", "Monitor 27\" 144Hz", 0, 4599, 3100, 5, 3),
    prod("PAPE-001", "Cuaderno profesional", 1, 65, 28, 220, 40),
    prod("PAPE-002", "Bolígrafo gel (caja)", 1, 120, 55, 4, 20),            // low stock
    prod("HERR-001", "Taladro percutor 800W", 2, 1899, 1200, 17, 5),
    prod("HERR-002", "Juego de brocas x50", 2, 349, 180, 60, 15),
    prod("CONS-001", "Café en grano 1kg", 3, 380, 210, 9, 10),             // low stock
  ];
  const pId = (i: number) => products[i].id;

  const movements = [
    { id: uuid(), productId: pId(0), type: "in", quantity: 50, reason: "Compra inicial", reference: null, createdAt: day(-20, 10) },
    { id: uuid(), productId: pId(0), type: "out", quantity: 16, reason: "Venta", reference: null, createdAt: day(-6, 15) },
    { id: uuid(), productId: pId(1), type: "out", quantity: 22, reason: "Venta mayoreo", reference: null, createdAt: day(-3, 11) },
    { id: uuid(), productId: pId(2), type: "adjust", quantity: 5, reason: "Ajuste inventario", reference: null, createdAt: day(-1, 9) },
  ];

  const order = (ci: number, status: string, items: [number, number][], stockApplied: boolean): Row => {
    const its = items.map(([pi, q]) => ({
      id: uuid(), productId: pId(pi), name: products[pi].name, quantity: q, unitPrice: products[pi].price,
    }));
    const total = its.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
    return {
      id: uuid(), contactId: ctId(ci), companyId: contacts[ci].companyId,
      status, currency: "MXN", notes: null, total: total.toFixed(2),
      stockApplied, createdAt: nowISO(), items: its,
    };
  };
  const orders = [
    order(0, "fulfilled", [[0, 2], [3, 5]], true),
    order(1, "confirmed", [[5, 3], [6, 4]], false),
    order(7, "quote", [[2, 1]], false),
  ];

  const activities = [
    { id: uuid(), contactId: ctId(0), type: "note", body: "Reunión inicial: le encantó la propuesta de rebranding.", createdAt: day(-4, 10) },
    { id: uuid(), contactId: ctId(0), type: "order", body: "Pedido entregado (2× Teclado, 5× Cuaderno).", createdAt: day(-2, 16) },
    { id: uuid(), contactId: ctId(1), type: "call", body: "Llamada: negocia descuento por volumen.", createdAt: day(-1, 12) },
    { id: uuid(), contactId: ctId(3), type: "stage", body: "Etapa: lead → prospect.", createdAt: day(-3, 9) },
  ];

  const tasks = [
    { id: uuid(), contactId: ctId(0), title: "Enviar contrato firmado", dueAt: day(0, 18), done: false, completedAt: null, createdAt: nowISO() },
    { id: uuid(), contactId: ctId(1), title: "Cotización mayoreo Q3", dueAt: day(1, 12), done: false, completedAt: null, createdAt: nowISO() },
    { id: uuid(), contactId: ctId(3), title: "Demo técnica de migración", dueAt: day(2, 11), done: false, completedAt: null, createdAt: nowISO() },
    { id: uuid(), contactId: ctId(2), title: "Llamada de seguimiento", dueAt: day(-1, 10), done: true, completedAt: day(-1, 11), createdAt: nowISO() },
  ];

  const events = [
    { id: uuid(), title: "Kickoff Nébula", description: "Rebranding", location: "Oficina", startAt: day(0, 10), endAt: day(0, 11), allDay: false, color: "#7c3aed", contactId: ctId(0), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Comida con Diego (mayoreo)", description: null, location: "Restaurante Centro", startAt: day(0, 14, 30), endAt: day(0, 16), allDay: false, color: "#0ea5e9", contactId: ctId(1), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Demo técnica migración", description: "TechBodega", location: "Videollamada", startAt: day(1, 11), endAt: day(1, 12), allDay: false, color: "#22c55e", contactId: ctId(3), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Revisión de propuesta", description: null, location: null, startAt: day(2, 9, 30), endAt: day(2, 10, 30), allDay: false, color: "#f59e0b", contactId: ctId(2), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Seguimiento Clínica Aurora", description: null, location: "Teléfono", startAt: day(-1, 12), endAt: day(-1, 12, 30), allDay: false, color: "#ec4899", contactId: ctId(2), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Entrega de pedido", description: null, location: "Almacén", startAt: day(4, 9), endAt: day(4, 10), allDay: false, color: "#14b8a6", contactId: ctId(1), googleEventId: null, syncStatus: "local" },
    { id: uuid(), title: "Cierre trimestral", description: "Revisión de pipeline", location: null, startAt: day(9, 16), endAt: day(9, 17), allDay: false, color: "#ef4444", contactId: null, googleEventId: null, syncStatus: "local" },
  ];

  return { companies, contacts, opportunities, categories, products, movements, orders, activities, tasks, events };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const s = seed();
  save(s);
  return s;
}
function save(s: Store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const store = load();
const persist = () => save(store);

// ── Helpers CRUD genéricos ────────────────────────────────
const okJson = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const okText = (t: string) => new Response(t, { status: 200, headers: { "content-type": "text/plain" } });

function genericCrud(coll: Row[], segs: string[], method: string, body: Row | undefined, params: URLSearchParams): Response | null {
  const id = segs[1];
  if (!id) {
    if (method === "GET") return okJson(coll);
    if (method === "POST") {
      const row = { id: uuid(), createdAt: nowISO(), ...body };
      coll.push(row); persist();
      return okJson(row, 201);
    }
  } else {
    const idx = coll.findIndex((r) => r.id === id);
    if (method === "GET") return okJson(idx >= 0 ? coll[idx] : null, idx >= 0 ? 200 : 404);
    if (method === "PATCH" && idx >= 0) { coll[idx] = { ...coll[idx], ...body }; persist(); return okJson(coll[idx]); }
    if (method === "DELETE" && idx >= 0) { coll.splice(idx, 1); persist(); return okJson({ ok: true }); }
  }
  return null;
}

function route(pathname: string, method: string, body: Row | undefined, params: URLSearchParams): Response {
  const segs = pathname.replace(/^\/api\//, "").replace(/\/$/, "").split("/");
  const [head] = segs;

  switch (head) {
    // — Integraciones que no existen en la demo (respuestas benignas) —
    case "google": {
      if (segs[1] === "status") return okJson({ configured: false, connected: false, accounts: [] });
      if (segs[1] === "sync") return okJson({ ok: true, note: "Demo: sin conexión a Google." });
      if (segs[1] === "disconnect") return okJson({ ok: true });
      return okJson({ ok: true });
    }
    case "push": {
      if (segs[1] === "vapid-public-key") return okText("");   // → enablePush informa "no configurado"
      return okJson({ ok: true });
    }

    case "companies": return genericCrud(store.companies, segs, method, body, params) ?? okJson(null, 404);
    case "categories": return genericCrud(store.categories, segs, method, body, params) ?? okJson(null, 404);
    case "opportunities": return genericCrud(store.opportunities, segs, method, body, params) ?? okJson(null, 404);
    case "activities": {
      if (!segs[1] && method === "GET") {
        const c = params.get("contactId");
        return okJson(store.activities.filter((a) => !c || a.contactId === c).sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
      }
      return genericCrud(store.activities, segs, method, body, params) ?? okJson(null, 404);
    }
    case "tasks": {
      if (!segs[1] && method === "GET") {
        const c = params.get("contactId");
        return okJson(store.tasks.filter((t) => !c || t.contactId === c));
      }
      if (segs[1] && method === "PATCH") {
        const t = store.tasks.find((r) => r.id === segs[1]);
        if (t && body && "done" in body) body.completedAt = body.done ? nowISO() : null;
      }
      return genericCrud(store.tasks, segs, method, body, params) ?? okJson(null, 404);
    }
    case "contacts": {
      if (!segs[1] && method === "GET") {
        const stage = params.get("stage");
        return okJson(store.contacts.filter((c) => !stage || c.stage === stage));
      }
      return genericCrud(store.contacts, segs, method, body, params) ?? okJson(null, 404);
    }
    case "products": {
      if (!segs[1] && method === "GET") {
        const low = params.get("lowStock");
        return okJson(store.products.filter((p) => !low || p.stock <= p.minStock));
      }
      return genericCrud(store.products, segs, method, body, params) ?? okJson(null, 404);
    }
    case "movements": {
      if (!segs[1] && method === "GET") {
        const pid = params.get("productId");
        return okJson(store.movements.filter((m) => !pid || m.productId === pid).sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
      }
      if (!segs[1] && method === "POST" && body) {
        const p = store.products.find((r) => r.id === body.productId);
        if (p) {
          const q = Number(body.quantity) || 0;
          if (body.type === "in") p.stock += q;
          else if (body.type === "out") p.stock = Math.max(0, p.stock - q);
          else if (body.type === "adjust") p.stock = q;
        }
        const mv = { id: uuid(), reference: null, createdAt: nowISO(), ...body };
        store.movements.push(mv); persist();
        return okJson(mv, 201);
      }
      return okJson(null, 404);
    }
    case "orders": {
      if (!segs[1] && method === "GET") {
        const c = params.get("contactId");
        return okJson(store.orders.filter((o) => !c || o.contactId === c));
      }
      if (!segs[1] && method === "POST" && body) {
        const items = (body.items ?? []).map((it: Row) => ({ id: uuid(), ...it }));
        const total = items.reduce((s: number, it: Row) => s + Number(it.unitPrice || 0) * (it.quantity || 0), 0);
        const row = { id: uuid(), currency: "MXN", status: "quote", notes: null, stockApplied: false, createdAt: nowISO(), ...body, items, total: total.toFixed(2) };
        store.orders.push(row); persist();
        return okJson(row, 201);
      }
      const o = store.orders.find((r) => r.id === segs[1]);
      if (segs[1] && method === "GET") return okJson(o ?? null, o ? 200 : 404);
      if (o && method === "PATCH" && body) {
        const applyStock = (dir: 1 | -1) => (o.items ?? []).forEach((it: Row) => {
          const p = store.products.find((r) => r.id === it.productId);
          if (p) p.stock = Math.max(0, p.stock + dir * (it.quantity || 0));
        });
        if (body.status === "fulfilled" && !o.stockApplied) { applyStock(-1); o.stockApplied = true; }
        if ((body.status === "cancelled" || body.status === "quote") && o.stockApplied) { applyStock(1); o.stockApplied = false; }
        Object.assign(o, body);
        if (body.items) o.total = body.items.reduce((s: number, it: Row) => s + Number(it.unitPrice || 0) * (it.quantity || 0), 0).toFixed(2);
        persist();
        return okJson(o);
      }
      if (o && method === "DELETE") {
        if (o.stockApplied) (o.items ?? []).forEach((it: Row) => {
          const p = store.products.find((r) => r.id === it.productId);
          if (p) p.stock += it.quantity || 0;
        });
        store.orders = store.orders.filter((r) => r.id !== segs[1]); persist();
        return okJson({ ok: true });
      }
      return okJson(null, 404);
    }
    case "events": {
      if (!segs[1] && method === "GET") {
        const from = params.get("from"), to = params.get("to");
        return okJson(store.events.filter((e) => (!from || e.endAt >= from) && (!to || e.startAt <= to)));
      }
      return genericCrud(store.events, segs, method, body, params) ?? okJson(null, 404);
    }
  }
  return okJson(null, 404);
}

// ── Parche de fetch ───────────────────────────────────────
const origFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  let u: URL;
  try { u = new URL(url, location.origin); } catch { return origFetch(input as any, init); }
  if (!u.pathname.startsWith("/api/")) return origFetch(input as any, init);

  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  let body: Row | undefined;
  const raw = init?.body ?? (input instanceof Request ? undefined : undefined);
  if (raw && typeof raw === "string") { try { body = JSON.parse(raw); } catch { /* ignore */ } }

  // Pequeña latencia simulada para que los spinners se vean naturales.
  return new Promise((resolve) => setTimeout(() => resolve(route(u.pathname, method, body, u.searchParams)), 120));
}) as typeof window.fetch;

// Exponer un reset para el banner de demo.
(window as any).__resetCrmDemo = () => { localStorage.removeItem(STORE_KEY); location.reload(); };
