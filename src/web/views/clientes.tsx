import { useEffect, useState } from "preact/hooks";
import { api, Contact, Company, matchesQuery } from "../lib";
import { Modal, Toast, useToast, Empty, SearchBar } from "../components";
import { IconClientes } from "../icons";
import { ContactoDetalle } from "./contacto";

const STAGES = [
  { id: "lead", label: "Lead", color: "#60a5fa", desc: "Contacto nuevo sin calificar — entró pero todavía no sabemos si va a comprar." },
  { id: "prospect", label: "Prospecto", color: "#f59e0b", desc: "Lead calificado: mostró interés real y tiene potencial de compra." },
  { id: "customer", label: "Cliente", color: "#34d399", desc: "Ya compró o mantiene una relación comercial activa." },
  { id: "inactive", label: "Inactivo", color: "#7c8aa3", desc: "Sin actividad reciente o relación en pausa." },
];
const stageMeta = (id: string) => STAGES.find((s) => s.id === id) ?? STAGES[0];

type Draft = Partial<Contact> & { firstName: string };

export function Clientes() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [showLegend, setShowLegend] = useState(false);
  const [detail, setDetail] = useState<Contact | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tagInput, setTagInput] = useState("");
  const { msg, flash } = useToast();

  function openDraft(d: Draft | null) {
    setTagInput("");
    setDraft(d);
  }
  function addTag() {
    if (!draft) return;
    const t = tagInput.trim();
    if (!t) return setTagInput("");
    const cur = draft.tags ?? [];
    if (!cur.includes(t)) setDraft({ ...draft, tags: [...cur, t] });
    setTagInput("");
  }
  function removeTag(t: string) {
    if (!draft) return;
    setDraft({ ...draft, tags: (draft.tags ?? []).filter((x) => x !== t) });
  }

  const load = async () => setContacts(await api.contacts.list(filter ? `?stage=${filter}` : ""));
  const loadCompanies = async () => setCompanies(await api.companies.list());
  useEffect(() => { load(); }, [filter]);
  useEffect(() => { loadCompanies(); }, []);

  const companyName = (id?: string | null) => companies.find((c) => c.id === id)?.name;
  // Búsqueda client-side: nombre + apellido + email + teléfono + puesto + empresa (sin acentos).
  const filtered = contacts.filter((c) => matchesQuery(query, c.firstName, c.lastName, c.email, c.phone, c.title, companyName(c.companyId)));

  async function save() {
    if (!draft?.firstName?.trim()) return flash("El nombre es obligatorio");
    const pending = tagInput.trim();
    const tags = pending && !(draft.tags ?? []).includes(pending) ? [...(draft.tags ?? []), pending] : (draft.tags ?? []);
    const payload = { ...draft, firstName: draft.firstName.trim(), tags };
    const editing = draft.id;
    if (editing) await api.contacts.update(editing, payload);
    else await api.contacts.create(payload);
    setTagInput("");
    setDraft(null);
    await load();
    // Si estábamos viendo el detalle de este contacto, refrescarlo.
    if (editing && detail && detail.id === editing) setDetail(await api.contacts.get(editing));
    flash(editing ? "Contacto actualizado" : "Contacto creado");
  }
  async function del() {
    if (!draft?.id || !confirm("¿Eliminar este contacto?")) return;
    await api.contacts.remove(draft.id);
    setDraft(null);
    setDetail(null);
    await load();
  }

  const modal = draft ? (
    <Modal
      title={draft.id ? "Editar contacto" : "Nuevo contacto"}
      onClose={() => setDraft(null)}
      footer={<>
        {draft.id && <button class="danger" onClick={del}>Eliminar</button>}
        <div class="spacer" />
        <button class="ghost wide" onClick={() => setDraft(null)}>Cancelar</button>
        <button class="primary" onClick={save}>Guardar</button>
      </>}
    >
      <div class="row">
        <label class="field">Nombre<input value={draft.firstName} onInput={(e) => setDraft({ ...draft, firstName: (e.target as HTMLInputElement).value })} autofocus /></label>
        <label class="field">Apellido<input value={draft.lastName ?? ""} onInput={(e) => setDraft({ ...draft, lastName: (e.target as HTMLInputElement).value })} /></label>
      </div>
      <label class="field">Etapa
        <select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: (e.target as HTMLSelectElement).value })}>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <p class="hint">{stageMeta(draft.stage ?? "lead").desc}</p>
      <label class="field">Empresa
        <select value={draft.companyId ?? ""} onChange={(e) => setDraft({ ...draft, companyId: (e.target as HTMLSelectElement).value || null })}>
          <option value="">— ninguna —</option>
          {companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
        </select>
      </label>
      <label class="field">Puesto<input value={draft.title ?? ""} onInput={(e) => setDraft({ ...draft, title: (e.target as HTMLInputElement).value })} /></label>
      <div class="row">
        <label class="field">Email<input type="email" value={draft.email ?? ""} onInput={(e) => setDraft({ ...draft, email: (e.target as HTMLInputElement).value })} /></label>
        <label class="field">Teléfono<input value={draft.phone ?? ""} onInput={(e) => setDraft({ ...draft, phone: (e.target as HTMLInputElement).value })} /></label>
      </div>
      <label class="field">Notas<textarea value={draft.notes ?? ""} onInput={(e) => setDraft({ ...draft, notes: (e.target as HTMLTextAreaElement).value })} rows={2} /></label>
      <label class="field">Etiquetas
        <div class="tags-edit">
          {(draft.tags ?? []).map((t) => (
            <span key={t} class="tag-chip">{t}<button type="button" onClick={() => removeTag(t)} aria-label={`quitar ${t}`}>×</button></span>
          ))}
          <input
            class="tag-add"
            value={tagInput}
            placeholder={(draft.tags ?? []).length ? "+ etiqueta" : "ej. mayorista, vip… (Enter)"}
            onInput={(e) => setTagInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
            onBlur={addTag}
          />
        </div>
      </label>
    </Modal>
  ) : null;

  // Vista detalle de un contacto (timeline + tareas + pedidos).
  if (detail) {
    return (
      <>
        <ContactoDetalle
          contact={detail}
          companyName={companyName(detail.companyId)}
          stageMeta={stageMeta}
          onBack={() => setDetail(null)}
          onEdit={() => openDraft({ ...detail })}
        />
        {modal}
        <Toast msg={msg} />
      </>
    );
  }

  return (
    <div class="view">
      <header class="topbar">
        <div class="brand"><IconClientes /> Clientes</div>
        <button class="primary sm" onClick={() => openDraft({ firstName: "", stage: "lead" })}>+ Nuevo</button>
      </header>

      <SearchBar value={query} onInput={setQuery} placeholder="Buscar nombre, apellido, email, empresa…" />

      <div class="chips-row">
        <button class={`fchip${filter === "" ? " active" : ""}`} onClick={() => setFilter("")}>Todos</button>
        {STAGES.map((s) => (
          <button key={s.id} class={`fchip${filter === s.id ? " active" : ""}`} onClick={() => setFilter(s.id)} style={{ "--c": s.color }}>{s.label}</button>
        ))}
      </div>

      {filter ? (
        <div class="legend">
          <div class="legend-row">
            <span class="badge" style={{ background: stageMeta(filter).color }}>{stageMeta(filter).label}</span>
            <span class="muted small">{stageMeta(filter).desc}</span>
          </div>
        </div>
      ) : (
        <>
          <button class="legend-toggle" onClick={() => setShowLegend((v) => !v)}>
            {showLegend ? "▾" : "▸"} ¿Qué significa cada etapa?
          </button>
          {showLegend && (
            <div class="legend">
              {STAGES.map((s) => (
                <div key={s.id} class="legend-row">
                  <span class="badge" style={{ background: s.color }}>{s.label}</span>
                  <span class="muted small">{s.desc}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {filtered.length === 0 ? (
        <Empty Icon={IconClientes} text={query.trim() ? "Sin resultados para esa búsqueda." : "Sin contactos. Creá el primero con “+ Nuevo”."} />
      ) : (
        <div class="cards">
          {filtered.map((c) => {
            const sm = stageMeta(c.stage);
            return (
              <button key={c.id} class="card" onClick={() => setDetail({ ...c })}>
                <div class="card-top">
                  <strong>{c.firstName} {c.lastName ?? ""}</strong>
                  <span class="badge" style={{ background: sm.color }}>{sm.label}</span>
                </div>
                {c.title && <div class="muted">{c.title}</div>}
                {companyName(c.companyId) && <div class="muted">🏢 {companyName(c.companyId)}</div>}
                <div class="card-meta">
                  {c.email && <span>✉ {c.email}</span>}
                  {c.phone && <span>☎ {c.phone}</span>}
                </div>
                {c.tags && c.tags.length > 0 && <div class="tags">{c.tags.map((t) => <span key={t} class="tag">{t}</span>)}</div>}
              </button>
            );
          })}
        </div>
      )}

      {modal}
      <Toast msg={msg} />
    </div>
  );
}
