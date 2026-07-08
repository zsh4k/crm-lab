import { useEffect, useMemo, useState } from "preact/hooks";
import { api, Opportunity, Contact, money, MONTHS, matchesQuery } from "../lib";
import { Modal, Toast, useToast, Empty, SearchBar } from "../components";
import { IconPipeline } from "../icons";
import { LineChart } from "../charts";
import { LineChartJs } from "../charts-chartjs";

const STATUSES = [
  { id: "open", label: "Abiertas", color: "#22d3ee" },
  { id: "won", label: "Ganadas", color: "#34d399" },
  { id: "lost", label: "Inversiones", color: "#f59e0b" },
];

type Draft = Partial<Opportunity> & { title: string };

export function Pipeline() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [mCursor, setMCursor] = useState(() => new Date());
  const [scope, setScope] = useState<"month" | "all">("month");
  const { msg, flash } = useToast();

  // Serie de ejemplo para la sección Tendencia (ingresos por mes, 6 meses).
  const revSeries = useMemo(() => {
    const sample = [82000, 96000, 88000, 121000, 104000, 143000];
    const n = sample.length;
    const base = new Date();
    return sample.map((value, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (n - 1) + i, 1);
      return { label: MONTHS[d.getMonth()].slice(0, 3), value };
    });
  }, []);
  const kfmt = (v: number) => `$${Math.round(v / 1000)}k`;

  const load = async () => setOpps(await api.opportunities.list());
  useEffect(() => { load(); api.contacts.list().then(setContacts); }, []);

  const contactName = (id?: string | null) => {
    const c = contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null;
  };
  // "Del mes actual": pertenece al mes por su fecha de cierre esperada (o creación si no tiene).
  const inMonth = (o: Opportunity) => {
    const d = new Date(o.expectedCloseAt ?? o.createdAt);
    return d.getMonth() === mCursor.getMonth() && d.getFullYear() === mCursor.getFullYear();
  };
  const visible = opps.filter((o) => (scope === "all" || inMonth(o)) && matchesQuery(query, o.title, contactName(o.contactId), o.stage));
  const totalOf = (status: string) =>
    visible.filter((o) => o.status === status).reduce((s, o) => s + Number(o.amount), 0);
  const moveMonth = (delta: number) => { setScope("month"); setMCursor(new Date(mCursor.getFullYear(), mCursor.getMonth() + delta, 1)); };

  async function save() {
    if (!draft?.title?.trim()) return flash("El título es obligatorio");
    const payload = { ...draft, title: draft.title.trim() };
    if (draft.id) await api.opportunities.update(draft.id, payload);
    else await api.opportunities.create(payload);
    setDraft(null);
    await load();
    flash(draft.id ? "Oportunidad actualizada" : "Oportunidad creada");
  }
  async function del() {
    if (!draft?.id || !confirm("¿Eliminar esta oportunidad?")) return;
    await api.opportunities.remove(draft.id);
    setDraft(null);
    await load();
  }

  return (
    <div class="view">
      <header class="topbar">
        <div class="brand"><IconPipeline /> Pipeline</div>
        <button class="primary sm" onClick={() => setDraft({ title: "", status: "open", amount: "0", currency: "MXN" })}>+ Nueva</button>
      </header>

      {/* Tendencia — comparación de estilos: SVG a mano vs Chart.js */}
      <h2 class="sec-title">Tendencia · Ingresos por mes</h2>
      <div class="chart-card">
        <div class="cmp-tag">SVG a mano <span class="dim">· +3 KB · líneas rectas</span></div>
        <LineChart data={revSeries} format={kfmt} id="pipe-rev" />
        <div class="cmp-tag" style={{ marginTop: "16px" }}>Chart.js <span class="dim">· +~65 KB · curva suave</span></div>
        <LineChartJs data={revSeries} format={kfmt} />
      </div>

      {opps.length === 0 ? (
        <Empty Icon={IconPipeline} text="Sin oportunidades. Creá la primera con “+ Nueva”." />
      ) : (
        <>
          <SearchBar value={query} onInput={setQuery} placeholder="Buscar oportunidad, contacto, etapa…" />
          <div class="pipe-monthbar">
            <button class="ghost" onClick={() => moveMonth(-1)} aria-label="Mes anterior">‹</button>
            <button class={`fchip${scope === "month" ? " active" : ""}`} onClick={() => setScope("month")}>{MONTHS[mCursor.getMonth()]} {mCursor.getFullYear()}</button>
            <button class="ghost" onClick={() => moveMonth(1)} aria-label="Mes siguiente">›</button>
            <button class={`fchip${scope === "all" ? " active" : ""}`} onClick={() => setScope("all")}>Todas</button>
          </div>
          <div class="pipe">
            {STATUSES.map((s) => {
              const list = visible.filter((o) => o.status === s.id);
              return (
                <section key={s.id} class="pipe-col">
                  <div class="pipe-head" style={{ "--c": s.color }}>
                    <span>{s.label}</span>
                    <span class="pipe-total">{money(totalOf(s.id))}</span>
                  </div>
                  {list.map((o) => (
                    <button key={o.id} class="card" onClick={() => setDraft({ ...o })}>
                      <div class="card-top"><strong>{o.title}</strong></div>
                      <div class="amount">{money(o.amount, o.currency)}</div>
                      {contactName(o.contactId) && <div class="muted">👤 {contactName(o.contactId)}</div>}
                      <div class="muted small">Etapa: {o.stage}</div>
                    </button>
                  ))}
                  {list.length === 0 && <div class="pipe-empty">—</div>}
                </section>
              );
            })}
          </div>
        </>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Editar oportunidad" : "Nueva oportunidad"}
          onClose={() => setDraft(null)}
          footer={<>
            {draft.id && <button class="danger" onClick={del}>Eliminar</button>}
            <div class="spacer" />
            <button class="ghost wide" onClick={() => setDraft(null)}>Cancelar</button>
            <button class="primary" onClick={save}>Guardar</button>
          </>}
        >
          <label class="field">Título<input value={draft.title} onInput={(e) => setDraft({ ...draft, title: (e.target as HTMLInputElement).value })} placeholder="Pedido…" autofocus /></label>
          <div class="row">
            <label class="field">Monto (MXN)<input type="number" value={draft.amount ?? "0"} onInput={(e) => setDraft({ ...draft, amount: (e.target as HTMLInputElement).value })} /></label>
            <label class="field">Estado
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: (e.target as HTMLSelectElement).value })}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label class="field">Etapa del pipeline<input value={draft.stage ?? "nuevo"} onInput={(e) => setDraft({ ...draft, stage: (e.target as HTMLInputElement).value })} placeholder="nuevo / negociación / propuesta…" /></label>
          <label class="field">Contacto
            <select value={draft.contactId ?? ""} onChange={(e) => setDraft({ ...draft, contactId: (e.target as HTMLSelectElement).value || null })}>
              <option value="">— ninguno —</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ""}</option>)}
            </select>
          </label>
        </Modal>
      )}
      <Toast msg={msg} />
    </div>
  );
}
