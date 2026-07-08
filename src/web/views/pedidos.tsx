import { useEffect, useMemo, useState } from "preact/hooks";
import { api, money, matchesQuery, type Order, type Contact, type Product } from "../lib";
import { Modal, Toast, useToast, Empty, SearchBar } from "../components";
import { IconPedidos } from "../icons";

const STATUS = [
  { id: "quote", l: "Cotización", c: "#7c8aa3" },
  { id: "confirmed", l: "Confirmado", c: "#60a5fa" },
  { id: "fulfilled", l: "Entregado", c: "#34d399" },
  { id: "cancelled", l: "Cancelado", c: "#f43f5e" },
];
const statusMeta = (id: string) => STATUS.find((s) => s.id === id) ?? STATUS[0];
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

interface Line { productId: string; name: string; quantity: number; unitPrice: string }
interface Draft {
  id?: string;
  contactId: string | null;
  status: string;
  currency: string;
  notes: string;
  items: Line[];
}

const blankLine = (): Line => ({ productId: "", name: "", quantity: 1, unitPrice: "0" });

export function Pedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const { msg, flash } = useToast();

  const load = async () => setOrders(await api.orders.list());
  useEffect(() => {
    load();
    api.contacts.list().then(setContacts);
    api.products.list().then(setProducts);
  }, []);

  const contactName = (id?: string | null) => {
    const c = contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null;
  };
  const filtered = orders.filter((o) => matchesQuery(query, contactName(o.contactId), o.total, statusMeta(o.status).l, o.notes));

  function openNew() {
    setDraft({ contactId: null, status: "quote", currency: "MXN", notes: "", items: [blankLine()] });
  }
  async function openEdit(o: Order) {
    const full = await api.orders.get(o.id);
    setDraft({
      id: full.id,
      contactId: full.contactId ?? null,
      status: full.status,
      currency: full.currency,
      notes: full.notes ?? "",
      items: (full.items ?? []).map((it) => ({ productId: it.productId ?? "", name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
    });
  }

  function setLine(i: number, patch: Partial<Line>) {
    if (!draft) return;
    const items = draft.items.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
    setDraft({ ...draft, items });
  }
  function pickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setLine(i, p ? { productId, name: p.name, unitPrice: p.price } : { productId: "" });
  }
  const addLine = () => draft && setDraft({ ...draft, items: [...draft.items, blankLine()] });
  const removeLine = (i: number) => draft && setDraft({ ...draft, items: draft.items.filter((_, idx) => idx !== i) });

  const total = useMemo(() => {
    if (!draft) return 0;
    return draft.items.reduce((s, l) => s + Number(l.unitPrice) * l.quantity, 0);
  }, [draft]);

  async function save() {
    if (!draft) return;
    const items = draft.items
      .filter((l) => l.productId && l.quantity > 0)
      .map((l) => ({ productId: l.productId, name: l.name, quantity: Number(l.quantity), unitPrice: String(l.unitPrice) }));
    if (items.length === 0) return flash("Agregá al menos un ítem con producto");
    const payload = { contactId: draft.contactId, status: draft.status, currency: draft.currency, notes: draft.notes, items };
    try {
      if (draft.id) await api.orders.update(draft.id, payload as Partial<Order>);
      else await api.orders.create(payload as Partial<Order>);
      setDraft(null);
      await load();
      api.products.list().then(setProducts); // el stock pudo cambiar
      flash(draft.id ? "Pedido actualizado" : "Pedido creado");
    } catch {
      flash("Error al guardar el pedido");
    }
  }
  async function fulfill(o: Order) {
    if (!confirm("¿Marcar como entregado? Esto descuenta el stock de los productos.")) return;
    const res = (await api.orders.update(o.id, { status: "fulfilled" } as Partial<Order>)) as Order & { error?: string };
    if ((res as { error?: string }).error) flash((res as { error?: string }).error!);
    else flash("Pedido entregado · stock descontado");
    await load();
    api.products.list().then(setProducts);
  }
  async function del() {
    if (!draft?.id || !confirm("¿Eliminar este pedido? Si estaba entregado, se repone el stock.")) return;
    await api.orders.remove(draft.id);
    setDraft(null);
    await load();
    api.products.list().then(setProducts);
  }

  return (
    <div class="view">
      <header class="topbar">
        <div class="brand"><IconPedidos /> Pedidos</div>
        <button class="primary sm" onClick={openNew}>+ Nuevo</button>
      </header>

      <SearchBar value={query} onInput={setQuery} placeholder="Buscar por contacto, estado, total…" />
      {filtered.length === 0 ? (
        <Empty Icon={IconPedidos} text={query.trim() ? "Sin resultados para esa búsqueda." : "Sin pedidos. Creá una cotización o pedido con “+ Nuevo”."} />
      ) : (
        <div class="cards">
          {filtered.map((o) => {
            const sm = statusMeta(o.status);
            return (
              <div key={o.id} class="card order-card">
                <button class="order-main" onClick={() => openEdit(o)}>
                  <div class="card-top">
                    <strong>{money(o.total, o.currency)}</strong>
                    <span class="badge" style={{ background: sm.c }}>{sm.l}</span>
                  </div>
                  <div class="muted">{contactName(o.contactId) ?? "Sin contacto"}</div>
                  <div class="muted small">{fmtDateTime(o.createdAt)}</div>
                </button>
                {o.status !== "fulfilled" && o.status !== "cancelled" && (
                  <button class="primary sm fulfillbtn" onClick={() => fulfill(o)}>Entregar</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Editar pedido" : "Nuevo pedido"}
          onClose={() => setDraft(null)}
          footer={<>
            {draft.id && <button class="danger" onClick={del}>Eliminar</button>}
            <div class="spacer" />
            <button class="ghost wide" onClick={() => setDraft(null)}>Cancelar</button>
            <button class="primary" onClick={save}>Guardar</button>
          </>}
        >
          <label class="field">Contacto
            <select value={draft.contactId ?? ""} onChange={(e) => setDraft({ ...draft, contactId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— ninguno —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ""}</option>)}
            </select>
          </label>
          <label class="field">Estado
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: (e.target as HTMLSelectElement).value })}>
              {STATUS.map((s) => <option key={s.id} value={s.id}>{s.l}</option>)}
            </select>
          </label>
          {draft.status === "fulfilled" && <p class="hint">Al guardar como “Entregado” se descuenta el stock de cada producto.</p>}

          <div class="ordhdr"><span>Ítems</span><button class="linkbtn" onClick={addLine}>+ agregar</button></div>
          {draft.items.map((l, i) => (
            <div key={i} class="orderline">
              <select value={l.productId} onChange={(e) => pickProduct(i, (e.target as HTMLSelectElement).value)}>
                <option value="">— producto —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stk {p.stock})</option>)}
              </select>
              <input class="qty" type="number" min={1} value={l.quantity} onInput={(e) => setLine(i, { quantity: Number((e.target as HTMLInputElement).value) })} aria-label="cantidad" />
              <input class="price" type="number" step="0.01" value={l.unitPrice} onInput={(e) => setLine(i, { unitPrice: (e.target as HTMLInputElement).value })} aria-label="precio" />
              <button class="linkbtn" onClick={() => removeLine(i)} aria-label="quitar">×</button>
            </div>
          ))}
          <div class="ordtotal">Total: <strong>{money(total, draft.currency)}</strong></div>

          <label class="field">Notas<textarea value={draft.notes} onInput={(e) => setDraft({ ...draft, notes: (e.target as HTMLTextAreaElement).value })} rows={2} /></label>
        </Modal>
      )}
      <Toast msg={msg} />
    </div>
  );
}
