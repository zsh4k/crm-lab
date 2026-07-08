// ── Tipos ──────────────────────────────────────────────────
export interface CrmEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color?: string | null;
  contactId?: string | null;
  googleEventId?: string | null;
  syncStatus: string;
}

export interface GoogleAccount {
  id: string;
  email: string;
  calendarId: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}
export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  accounts: GoogleAccount[];
}

export interface Company {
  id: string;
  name: string;
  domain?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
}
export interface Contact {
  id: string;
  companyId?: string | null;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  stage: string;
  source?: string | null;
  tags?: string[];
  notes?: string | null;
  createdAt: string;
}
export interface Opportunity {
  id: string;
  contactId?: string | null;
  companyId?: string | null;
  title: string;
  amount: string;
  currency: string;
  status: string;
  stage: string;
  expectedCloseAt?: string | null;
  createdAt: string;
}
export interface Category {
  id: string;
  name: string;
  description?: string | null;
}
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  price: string;
  cost: string;
  stock: number;
  minStock: number;
  unit: string;
  active: boolean;
  createdAt: string;
}
export interface Movement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  reason?: string | null;
  reference?: string | null;
  createdAt: string;
}
export interface OrderItem {
  id?: string;
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
}
export interface Order {
  id: string;
  contactId?: string | null;
  companyId?: string | null;
  status: string;
  currency: string;
  notes?: string | null;
  total: string;
  stockApplied: boolean;
  createdAt: string;
  items?: OrderItem[];
}
export interface Activity {
  id: string;
  contactId: string;
  type: string;
  body: string;
  createdAt: string;
}
export interface Task {
  id: string;
  contactId?: string | null;
  title: string;
  dueAt?: string | null;
  done: boolean;
  completedAt?: string | null;
  createdAt: string;
}

// ── API ────────────────────────────────────────────────────
const json = (r: Response) => r.json();
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then(json);

function crud<T>(base: string) {
  return {
    list: (qs = ""): Promise<T[]> => fetch(`${base}${qs}`).then(json),
    get: (id: string): Promise<T> => fetch(`${base}/${id}`).then(json),
    create: (d: Partial<T>): Promise<T> => send(base, "POST", d),
    update: (id: string, d: Partial<T>): Promise<T> => send(`${base}/${id}`, "PATCH", d),
    remove: (id: string): Promise<{ ok: boolean }> => send(`${base}/${id}`, "DELETE"),
  };
}

export const api = {
  events: {
    list: (from: string, to: string): Promise<CrmEvent[]> =>
      fetch(`/api/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(json),
    create: (d: Partial<CrmEvent>): Promise<CrmEvent> => send("/api/events", "POST", d),
    update: (id: string, d: Partial<CrmEvent>): Promise<CrmEvent> => send(`/api/events/${id}`, "PATCH", d),
    remove: (id: string): Promise<{ ok: boolean }> => send(`/api/events/${id}`, "DELETE"),
  },
  google: {
    status: (): Promise<GoogleStatus> => fetch("/api/google/status").then(json),
    disconnect: (id: string): Promise<{ ok: boolean }> => send(`/api/google/disconnect/${id}`, "POST"),
    sync: (): Promise<{ ok: boolean }> => send("/api/google/sync", "POST"),
  },
  contacts: crud<Contact>("/api/contacts"),
  companies: crud<Company>("/api/companies"),
  opportunities: crud<Opportunity>("/api/opportunities"),
  categories: crud<Category>("/api/categories"),
  products: crud<Product>("/api/products"),
  movements: {
    list: (qs = ""): Promise<Movement[]> => fetch(`/api/movements${qs}`).then(json),
    create: (d: { productId: string; type: string; quantity: number; reason?: string }): Promise<unknown> =>
      send("/api/movements", "POST", d),
  },
  orders: crud<Order>("/api/orders"),
  activities: crud<Activity>("/api/activities"),
  tasks: crud<Task>("/api/tasks"),
};

// ── Web Push (recordatorios) ───────────────────────────────
function urlB64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushState = "unsupported" | "default" | "denied" | "subscribed";

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? "subscribed" : "default";
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, error: "Tu navegador no soporta notificaciones push." };
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, error: "Permiso de notificaciones denegado." };
  const key = await fetch("/api/push/vapid-public-key").then((r) => r.text());
  if (!key) return { ok: false, error: "Web Push no está configurado en el servidor." };
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(key) as BufferSource });
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : "Desktop";
  await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...sub.toJSON(), platform }) });
  return { ok: true };
}

export const pushTest = (): Promise<unknown> => fetch("/api/push/test", { method: "POST" }).then((r) => r.json());

// ── Formato ────────────────────────────────────────────────
export const money = (v: string | number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(Number(v));

// ── Búsqueda (insensible a mayúsculas y acentos, multi-campo) ──────────
export const normalize = (s: string): string => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
/** ¿La query aparece en alguno de los campos (acentos/mayúsculas ignorados)? Query vacía = todo. */
export function matchesQuery(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const nq = normalize(query.trim());
  if (!nq) return true;
  const hay = normalize(fields.filter((f) => f != null && f !== "").join(" "));
  return hay.includes(nq);
}

// ── Fechas (semana inicia lunes, es-MX) ────────────────────
export const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function gridStart(d: Date): Date {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start;
}
export function monthGrid(d: Date): Date[] {
  const start = gridStart(d);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}
export function weekStart(d: Date): Date {
  const x = new Date(d);
  const off = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - off);
  x.setHours(0, 0, 0, 0);
  return x;
}
export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isToday = (d: Date) => sameDay(d, new Date());
export const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fromLocalInput = (s: string): string => new Date(s).toISOString();
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
