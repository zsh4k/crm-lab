import { useEffect, useState } from "preact/hooks";
import { api, Product, Category, money, matchesQuery } from "../lib";
import { Modal, Toast, useToast, Empty, SearchBar } from "../components";
import { IconInventario } from "../icons";

type Draft = Partial<Product> & { sku: string; name: string };

export function Inventario() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [onlyLow, setOnlyLow] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mov, setMov] = useState<{ type: string; quantity: string }>({ type: "in", quantity: "" });
  const { msg, flash } = useToast();

  const load = async () => setProducts(await api.products.list(onlyLow ? "?lowStock=1" : ""));
  useEffect(() => { load(); }, [onlyLow]);
  useEffect(() => { api.categories.list().then(setCategories); }, []);

  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name;
  const filtered = products.filter((p) => matchesQuery(query, p.name, p.sku, catName(p.categoryId)));

  async function save() {
    if (!draft?.sku?.trim() || !draft?.name?.trim()) return flash("SKU y nombre son obligatorios");
    const res = draft.id
      ? await api.products.update(draft.id, draft)
      : await api.products.create(draft);
    const err = (res as unknown as { error?: string }).error;
    if (err) return flash(err);
    setDraft(null);
    await load();
    flash(draft.id ? "Producto actualizado" : "Producto creado");
  }
  async function del() {
    if (!draft?.id || !confirm("¿Eliminar este producto?")) return;
    await api.products.remove(draft.id);
    setDraft(null);
    await load();
  }
  async function applyMovement() {
    if (!draft?.id) return;
    const q = Number(mov.quantity);
    if (!Number.isFinite(q) || q < 0) return flash("Cantidad inválida");
    const res = (await api.movements.create({ productId: draft.id, type: mov.type, quantity: q })) as { error?: string; stock?: number };
    if (res.error) return flash(res.error);
    setMov({ type: "in", quantity: "" });
    await load();
    if (res.stock != null) setDraft({ ...draft, stock: res.stock });
    flash(`Stock actualizado: ${res.stock}`);
  }

  return (
    <div class="view">
      <header class="topbar">
        <div class="brand"><IconInventario /> Inventario</div>
        <button class="primary sm" onClick={() => setDraft({ sku: "", name: "", unit: "pza", price: "0", cost: "0", minStock: 0 })}>+ Nuevo</button>
      </header>

      <SearchBar value={query} onInput={setQuery} placeholder="Buscar producto, SKU, categoría…" />
      <div class="chips-row">
        <button class={`fchip${!onlyLow ? " active" : ""}`} onClick={() => setOnlyLow(false)}>Todos</button>
        <button class={`fchip${onlyLow ? " active" : ""}`} style={{ "--c": "#f43f5e" }} onClick={() => setOnlyLow(true)}>⚠ Bajo stock</button>
      </div>

      {filtered.length === 0 ? (
        <Empty Icon={IconInventario} text={query.trim() ? "Sin resultados para esa búsqueda." : "Sin productos. Agregá el primero con “+ Nuevo”."} />
      ) : (
        <div class="cards">
          {filtered.map((p) => {
            const low = p.stock <= p.minStock;
            return (
              <button key={p.id} class="card" onClick={() => { setMov({ type: "in", quantity: "" }); setDraft({ ...p }); }}>
                <div class="card-top">
                  <strong>{p.name}</strong>
                  <span class={`badge ${low ? "low" : "ok"}`}>{p.stock} {p.unit}</span>
                </div>
                <div class="muted small">SKU {p.sku}{catName(p.categoryId) ? ` · ${catName(p.categoryId)}` : ""}</div>
                <div class="card-meta">
                  <span class="amount">{money(p.price)}</span>
                  {low && <span class="low-tag">⚠ mín {p.minStock}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Editar producto" : "Nuevo producto"}
          onClose={() => setDraft(null)}
          footer={<>
            {draft.id && <button class="danger" onClick={del}>Eliminar</button>}
            <div class="spacer" />
            <button class="ghost wide" onClick={() => setDraft(null)}>Cancelar</button>
            <button class="primary" onClick={save}>Guardar</button>
          </>}
        >
          <div class="row">
            <label class="field">SKU<input value={draft.sku} onInput={(e) => setDraft({ ...draft, sku: (e.target as HTMLInputElement).value })} autofocus /></label>
            <label class="field">Unidad<input value={draft.unit ?? "pza"} onInput={(e) => setDraft({ ...draft, unit: (e.target as HTMLInputElement).value })} /></label>
          </div>
          <label class="field">Nombre<input value={draft.name} onInput={(e) => setDraft({ ...draft, name: (e.target as HTMLInputElement).value })} /></label>
          <label class="field">Categoría
            <select value={draft.categoryId ?? ""} onChange={(e) => setDraft({ ...draft, categoryId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— ninguna —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div class="row">
            <label class="field">Precio<input type="number" value={draft.price ?? "0"} onInput={(e) => setDraft({ ...draft, price: (e.target as HTMLInputElement).value })} /></label>
            <label class="field">Costo<input type="number" value={draft.cost ?? "0"} onInput={(e) => setDraft({ ...draft, cost: (e.target as HTMLInputElement).value })} /></label>
          </div>
          <div class="row">
            {!draft.id && <label class="field">Stock inicial<input type="number" value={String(draft.stock ?? 0)} onInput={(e) => setDraft({ ...draft, stock: Number((e.target as HTMLInputElement).value) })} /></label>}
            <label class="field">Stock mínimo<input type="number" value={String(draft.minStock ?? 0)} onInput={(e) => setDraft({ ...draft, minStock: Number((e.target as HTMLInputElement).value) })} /></label>
          </div>

          {draft.id && (
            <div class="mov-box">
              <div class="mov-title">Movimiento de stock <span class="dim">(actual: {draft.stock})</span></div>
              <div class="row">
                <label class="field">Tipo
                  <select value={mov.type} onChange={(e) => setMov({ ...mov, type: (e.target as HTMLSelectElement).value })}>
                    <option value="in">Entrada (+)</option>
                    <option value="out">Salida (−)</option>
                    <option value="adjust">Ajuste (=)</option>
                  </select>
                </label>
                <label class="field">Cantidad<input type="number" value={mov.quantity} onInput={(e) => setMov({ ...mov, quantity: (e.target as HTMLInputElement).value })} /></label>
              </div>
              <button class="ghost wide block" onClick={applyMovement}>Aplicar movimiento</button>
            </div>
          )}
        </Modal>
      )}
      <Toast msg={msg} />
    </div>
  );
}
