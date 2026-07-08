import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────
export const contactStage = pgEnum("contact_stage", ["lead", "prospect", "customer", "inactive"]);
export const opportunityStatus = pgEnum("opportunity_status", ["open", "won", "lost"]);
export const movementType = pgEnum("movement_type", ["in", "out", "adjust"]);
export const syncStatus = pgEnum("sync_status", ["local", "pending", "synced", "error"]);
export const syncDirection = pgEnum("sync_direction", ["inbound", "outbound"]);
export const orderStatus = pgEnum("order_status", ["quote", "confirmed", "fulfilled", "cancelled"]);
export const activityType = pgEnum("activity_type", ["note", "call", "email", "meeting", "whatsapp", "system"]);

const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ── CRM: empresas y contactos (clientes + prospectos) ──────
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  phone: varchar("phone", { length: 40 }),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt,
  updatedAt,
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    email: text("email"),
    phone: varchar("phone", { length: 40 }),
    title: text("title"),
    stage: contactStage("stage").default("lead").notNull(),
    source: text("source"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (t) => ({
    byStage: index("contacts_stage_idx").on(t.stage),
    byCompany: index("contacts_company_idx").on(t.companyId),
  }),
);

export const opportunities = pgTable("opportunities", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
  status: opportunityStatus("status").default("open").notNull(),
  stage: text("stage").default("nuevo").notNull(),
  expectedCloseAt: timestamp("expected_close_at", { withTimezone: true }),
  createdAt,
  updatedAt,
});

// ── Inventario ─────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt,
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sku: varchar("sku", { length: 64 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    price: numeric("price", { precision: 14, scale: 2 }).default("0").notNull(),
    cost: numeric("cost", { precision: 14, scale: 2 }).default("0").notNull(),
    stock: integer("stock").default(0).notNull(),
    minStock: integer("min_stock").default(0).notNull(),
    unit: varchar("unit", { length: 16 }).default("pza").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    skuUniq: uniqueIndex("products_sku_idx").on(t.sku),
  }),
);

export const inventoryMovements = pgTable("inventory_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  type: movementType("type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  createdAt,
});

// ── Google Calendar: cuentas conectadas (OAuth2) ───────────
export const googleAccounts = pgTable("google_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  // Tokens cifrados at-rest (AES-256-GCM). Nunca en claro.
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  scope: text("scope"),
  calendarId: text("calendar_id").default("primary").notNull(),
  // syncToken de Google para pull incremental.
  syncToken: text("sync_token"),
  syncEnabled: boolean("sync_enabled").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  createdAt,
  updatedAt,
});

// ── Agenda: eventos ────────────────────────────────────────
export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    allDay: boolean("all_day").default(false).notNull(),
    color: varchar("color", { length: 16 }),
    // Relaciones opcionales con el CRM.
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    opportunityId: uuid("opportunity_id").references(() => opportunities.id, { onDelete: "set null" }),
    // Vínculo con Google Calendar.
    googleAccountId: uuid("google_account_id").references(() => googleAccounts.id, { onDelete: "set null" }),
    googleEventId: text("google_event_id"),
    googleCalendarId: text("google_calendar_id"),
    etag: text("etag"),
    syncStatus: syncStatus("sync_status").default("local").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    deleted: boolean("deleted").default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({
    byStart: index("events_start_idx").on(t.startAt),
    byGoogleId: index("events_google_id_idx").on(t.googleEventId),
    bySyncStatus: index("events_sync_status_idx").on(t.syncStatus),
  }),
);

export const eventReminders = pgTable("event_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  minutesBefore: integer("minutes_before").notNull(),
  method: varchar("method", { length: 16 }).default("popup").notNull(),
});

// ── Auditoría de sincronización ────────────────────────────
export const syncLog = pgTable("sync_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleAccountId: uuid("google_account_id").references(() => googleAccounts.id, { onDelete: "cascade" }),
  direction: syncDirection("direction").notNull(),
  action: text("action").notNull(),
  eventId: uuid("event_id"),
  googleEventId: text("google_event_id"),
  detail: jsonb("detail"),
  createdAt,
});

// ── Web Push: suscripciones de dispositivos ────────────────
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    platform: text("platform"),
    createdAt,
  },
  (t) => ({ endpointUniq: uniqueIndex("push_endpoint_idx").on(t.endpoint) }),
);

// ── Pedidos / cotizaciones (une clientes ↔ inventario) ─────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    status: orderStatus("status").default("quote").notNull(),
    currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
    notes: text("notes"),
    total: numeric("total", { precision: 14, scale: 2 }).default("0").notNull(),
    // ¿Ya se descontó el stock? (true tras "fulfilled"). Evita doble descuento.
    stockApplied: boolean("stock_applied").default(false).notNull(),
    createdAt,
    updatedAt,
  },
  (t) => ({ byContact: index("orders_contact_idx").on(t.contactId) }),
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    // Snapshot del nombre/precio al momento del pedido (el producto puede cambiar).
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0").notNull(),
  },
  (t) => ({ byOrder: index("order_items_order_idx").on(t.orderId) }),
);

// ── Timeline de actividad por contacto ─────────────────────
export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "cascade" })
      .notNull(),
    type: activityType("type").default("note").notNull(),
    body: text("body").notNull(),
    createdAt,
  },
  (t) => ({ byContact: index("activities_contact_idx").on(t.contactId) }),
);

// ── Tareas / follow-ups ────────────────────────────────────
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    done: boolean("done").default(false).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => ({
    byContact: index("tasks_contact_idx").on(t.contactId),
    byDone: index("tasks_done_idx").on(t.done),
  }),
);
