import { useEffect, useMemo, useState } from "preact/hooks";
import {
  api,
  CrmEvent,
  Contact,
  GoogleStatus,
  DOW,
  MONTHS,
  monthGrid,
  gridStart,
  isToday,
  ymd,
  toLocalInput,
  fromLocalInput,
  fmtTime,
  weekStart,
  startOfDay,
  matchesQuery,
} from "../lib";
import { Modal, Toast, useToast, Empty, SearchBar } from "../components";
import { IconAgenda } from "../icons";

type ViewMode = "month" | "week" | "day";

type Draft = {
  id?: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  description: string;
  color: string;
  contactId: string;
  googleEventId?: string | null;
  syncStatus?: string;
};

const COLORS = ["#22d3ee", "#a855f7", "#f43f5e", "#f59e0b", "#34d399", "#60a5fa"];

export function Agenda({ target, onTargetUsed }: { target?: CrmEvent | null; onTargetUsed?: () => void } = {}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [gstatus, setGstatus] = useState<GoogleStatus | null>(null);
  const [picker, setPicker] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [query, setQuery] = useState("");
  const { msg, flash } = useToast();

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const weekDays = useMemo(() => {
    const s = weekStart(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, [cursor]);

  function rangeFor(): [Date, Date] {
    if (viewMode === "day") {
      const s = startOfDay(cursor);
      const e = new Date(s);
      e.setDate(s.getDate() + 1);
      return [s, e];
    }
    if (viewMode === "week") {
      const s = weekStart(cursor);
      const e = new Date(s);
      e.setDate(s.getDate() + 7);
      return [s, e];
    }
    const s = gridStart(cursor);
    const e = new Date(s);
    e.setDate(s.getDate() + 42);
    return [s, e];
  }
  async function loadEvents() {
    const [s, e] = rangeFor();
    setEvents(await api.events.list(s.toISOString(), e.toISOString()));
  }
  const loadGoogle = async () => setGstatus(await api.google.status());
  const loadContacts = async () => setContacts(await api.contacts.list());

  useEffect(() => {
    loadGoogle();
    loadContacts();
    const q = new URLSearchParams(location.search);
    const g = q.get("google");
    if (g === "connected") flash("✓ Google Calendar conectado");
    else if (g === "error") flash(`✗ Error de Google: ${q.get("msg") ?? "desconocido"}`);
    if (g) history.replaceState({}, "", location.pathname);
  }, []);
  useEffect(() => {
    loadEvents();
  }, [cursor, viewMode]);

  // Si vienen desde una cita en Inicio: ir a su día (vista Día) y abrir el evento.
  useEffect(() => {
    if (!target) return;
    setCursor(new Date(target.startAt));
    setViewMode("day");
    openEdit(target);
    onTargetUsed?.();
  }, [target]);

  const contactName = (id?: string | null) => {
    const c = contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null;
  };
  // El buscador filtra los eventos del rango cargado (título, cliente, lugar, notas).
  const filteredEvents = useMemo(
    () => events.filter((e) => matchesQuery(query, e.title, e.description, e.location, contactName(e.contactId))),
    [events, query, contacts],
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CrmEvent[]>();
    for (const e of filteredEvents) {
      const k = ymd(new Date(e.startAt));
      const arr = map.get(k);
      if (arr) arr.push(e);
      else map.set(k, [e]);
    }
    return map;
  }, [filteredEvents]);

  function openNew(day: Date) {
    const start = new Date(day);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    setDraft({ title: "", startAt: toLocalInput(start), endAt: toLocalInput(end), allDay: false, location: "", description: "", color: COLORS[0], contactId: "" });
  }
  // Clic en un día (Mes/Semana) → abrir la vista Día de ese día.
  function openDay(day: Date) {
    setCursor(new Date(day));
    setViewMode("day");
  }
  function openEdit(e: CrmEvent) {
    setDraft({
      id: e.id,
      title: e.title,
      startAt: toLocalInput(new Date(e.startAt)),
      endAt: toLocalInput(new Date(e.endAt)),
      allDay: e.allDay,
      location: e.location ?? "",
      description: e.description ?? "",
      color: e.color ?? COLORS[0],
      contactId: e.contactId ?? "",
      googleEventId: e.googleEventId,
      syncStatus: e.syncStatus,
    });
  }
  async function saveDraft() {
    if (!draft) return;
    if (!draft.title.trim()) return flash("El título es obligatorio");
    const payload: Partial<CrmEvent> = {
      title: draft.title.trim(),
      startAt: fromLocalInput(draft.startAt),
      endAt: fromLocalInput(draft.endAt),
      allDay: draft.allDay,
      location: draft.location || null,
      description: draft.description || null,
      color: draft.color,
      contactId: draft.contactId || null,
    };
    if (draft.id) await api.events.update(draft.id, payload);
    else await api.events.create(payload);
    setDraft(null);
    await loadEvents();
  }
  async function deleteDraft() {
    if (!draft?.id) return;
    if (!confirm("¿Eliminar este evento?")) return;
    await api.events.remove(draft.id);
    setDraft(null);
    await loadEvents();
  }
  const move = (delta: number) => {
    if (viewMode === "month") return setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    const d = new Date(cursor);
    d.setDate(d.getDate() + delta * (viewMode === "week" ? 7 : 1));
    setCursor(d);
  };
  const setYear = (y: number) => setCursor(new Date(y, cursor.getMonth(), 1));
  const pickMonth = (m: number) => { setCursor(new Date(cursor.getFullYear(), m, 1)); setPicker(false); };

  const byStart = (a: CrmEvent, b: CrmEvent) =>
    Number(b.allDay) - Number(a.allDay) || new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  const dayList = useMemo(
    () => (eventsByDay.get(ymd(cursor)) ?? []).slice().sort(byStart),
    [eventsByDay, cursor],
  );
  const eventRow = (e: CrmEvent) => (
    <button key={e.id} class="ev-row" style={{ borderLeftColor: e.color ?? COLORS[0] }} onClick={() => openEdit(e)}>
      <span class="ev-time">{e.allDay ? "Todo el día" : fmtTime(e.startAt)}</span>
      <span class="ev-title">
        {e.googleEventId ? "🔗 " : ""}
        {e.title}
        {contactName(e.contactId) ? <span class="ev-contact"> · {contactName(e.contactId)}</span> : null}
      </span>
    </button>
  );

  async function doSync() {
    flash("Sincronizando con Google…");
    await api.google.sync();
    setTimeout(async () => {
      await loadEvents();
      await loadGoogle();
      flash("✓ Sincronización disparada");
    }, 1500);
  }

  return (
    <div class="view">
      <header class="topbar">
        <div class="brand"><IconAgenda /> Agenda</div>
        <GoogleChip
          status={gstatus}
          onSync={doSync}
          onDisconnect={async (id) => { await api.google.disconnect(id); await loadGoogle(); flash("Cuenta desconectada"); }}
        />
      </header>

      <div class="calbar">
        <button class="ghost" onClick={() => move(-1)} aria-label="Anterior">‹</button>
        <h1 class="month">
          {viewMode === "month" && (
            <>
              <button class="month-pick" onClick={() => setPicker(true)} title="Cambiar mes">{MONTHS[cursor.getMonth()]}</button>
              <button class="month-pick dim" onClick={() => setPicker(true)} title="Cambiar año">{cursor.getFullYear()}</button>
            </>
          )}
          {viewMode === "week" && (
            <button class="month-pick" onClick={() => setPicker(true)}>
              {weekDays[0].getDate()}{weekDays[0].getMonth() !== weekDays[6].getMonth() ? ` ${MONTHS[weekDays[0].getMonth()].slice(0, 3)}` : ""} – {weekDays[6].getDate()} {MONTHS[weekDays[6].getMonth()].slice(0, 3)} <span class="dim">{weekDays[6].getFullYear()}</span>
            </button>
          )}
          {viewMode === "day" && (
            <button class="month-pick" onClick={() => setPicker(true)}>
              {DOW[(cursor.getDay() + 6) % 7]} {cursor.getDate()} {MONTHS[cursor.getMonth()].slice(0, 3)} <span class="dim">{cursor.getFullYear()}</span>
            </button>
          )}
        </h1>
        <button class="ghost" onClick={() => move(1)} aria-label="Siguiente">›</button>
        <button class="today" onClick={() => setCursor(new Date())}>Hoy</button>
      </div>

      <div class="viewtabs">
        {(["month", "week", "day"] as ViewMode[]).map((m) => (
          <button key={m} class={`vtab${viewMode === m ? " active" : ""}`} onClick={() => setViewMode(m)}>
            {m === "month" ? "Mes" : m === "week" ? "Semana" : "Día"}
          </button>
        ))}
      </div>

      <SearchBar value={query} onInput={setQuery} placeholder="Buscar evento, cliente, lugar…" />

      {viewMode === "month" && (
        <>
          <div class="weekhead">{DOW.map((d) => <div key={d} class="weekhead-cell">{d}</div>)}</div>
          <div class="grid">
            {days.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const dayEvents = eventsByDay.get(ymd(day)) ?? [];
              return (
                <div key={ymd(day)} class={`cell${inMonth ? "" : " out"}${isToday(day) ? " today" : ""}`} onClick={() => openDay(day)}>
                  <div class="cell-num">{day.getDate()}</div>
                  <div class="cell-events">
                    {dayEvents.slice(0, 3).map((e) => (
                      <button key={e.id} class="chip" style={{ borderLeftColor: e.color ?? COLORS[0] }} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>
                        {e.googleEventId ? "🔗 " : ""}<span class="chip-time">{e.allDay ? "" : fmtTime(e.startAt)}</span> {e.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && <div class="more">+{dayEvents.length - 3} más</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {viewMode === "week" && (
        <div class="weekview">
          {weekDays.map((day) => {
            const evs = (eventsByDay.get(ymd(day)) ?? []).slice().sort(byStart);
            return (
              <section key={ymd(day)} class={`wv-day${isToday(day) ? " today" : ""}`}>
                <button class="wv-head" onClick={() => openDay(day)}>
                  <span class="wv-dow">{DOW[(day.getDay() + 6) % 7]}</span>
                  <span class="wv-date">{day.getDate()}</span>
                  <span class="wv-add" title="Agregar evento" role="button" onClick={(e) => { e.stopPropagation(); openNew(day); }}>＋</span>
                </button>
                <div class="wv-events">{evs.length ? evs.map(eventRow) : <div class="wv-empty">—</div>}</div>
              </section>
            );
          })}
        </div>
      )}

      {viewMode === "day" && (
        <div class="dayview">
          <button class="day-add" onClick={() => openNew(cursor)}>＋ Agregar evento</button>
          {dayList.length ? dayList.map(eventRow) : <Empty Icon={IconAgenda} text="Sin eventos este día." />}
        </div>
      )}

      {draft && (
        <Modal
          title={draft.id ? "Editar evento" : "Nuevo evento"}
          onClose={() => setDraft(null)}
          footer={<>
            {draft.id && <button class="danger" onClick={deleteDraft}>Eliminar</button>}
            <div class="spacer" />
            <button class="ghost wide" onClick={() => setDraft(null)}>Cancelar</button>
            <button class="primary" onClick={saveDraft}>Guardar</button>
          </>}
        >
          {draft.googleEventId && <div class="synced-note">🔗 Vinculado a Google · {draft.syncStatus}</div>}
          <label class="field">Título
            <input value={draft.title} onInput={(e) => setDraft({ ...draft, title: (e.target as HTMLInputElement).value })} placeholder="Reunión con…" autofocus />
          </label>
          <div class="row">
            <label class="field">Inicio<input type="datetime-local" value={draft.startAt} onInput={(e) => setDraft({ ...draft, startAt: (e.target as HTMLInputElement).value })} /></label>
            <label class="field">Fin<input type="datetime-local" value={draft.endAt} onInput={(e) => setDraft({ ...draft, endAt: (e.target as HTMLInputElement).value })} /></label>
          </div>
          <label class="field check"><input type="checkbox" checked={draft.allDay} onChange={(e) => setDraft({ ...draft, allDay: (e.target as HTMLInputElement).checked })} /> Todo el día</label>
          <label class="field">Cliente vinculado
            <select value={draft.contactId} onChange={(e) => setDraft({ ...draft, contactId: (e.target as HTMLSelectElement).value })}>
              <option value="">— ninguno —</option>
              {contacts.map((ct) => <option key={ct.id} value={ct.id}>{ct.firstName} {ct.lastName ?? ""}</option>)}
            </select>
          </label>
          <label class="field">Ubicación<input value={draft.location} onInput={(e) => setDraft({ ...draft, location: (e.target as HTMLInputElement).value })} placeholder="Opcional" /></label>
          <label class="field">Notas<textarea value={draft.description} onInput={(e) => setDraft({ ...draft, description: (e.target as HTMLTextAreaElement).value })} rows={2} /></label>
          <div class="colors">
            {COLORS.map((col) => <button key={col} class={`swatch${draft.color === col ? " sel" : ""}`} style={{ background: col }} onClick={() => setDraft({ ...draft, color: col })} aria-label={`color ${col}`} />)}
          </div>
        </Modal>
      )}
      {picker && (
        <MonthYearPicker cursor={cursor} onYear={setYear} onApply={pickMonth} onClose={() => setPicker(false)} />
      )}
      <Toast msg={msg} />
    </div>
  );
}

function MonthYearPicker({
  cursor,
  onYear,
  onApply,
  onClose,
}: {
  cursor: Date;
  onYear: (y: number) => void;
  onApply: (m: number) => void;
  onClose: () => void;
}) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  return (
    <div class="picker-bg" onClick={onClose}>
      <div class="picker" onClick={(e) => e.stopPropagation()}>
        <div class="picker-year">
          <button class="ghost" onClick={() => onYear(y - 1)} aria-label="Año anterior">‹</button>
          <input
            class="year-input"
            type="number"
            value={y}
            onChange={(e) => {
              const v = parseInt((e.target as HTMLInputElement).value, 10);
              if (!Number.isNaN(v)) onYear(v);
            }}
          />
          <button class="ghost" onClick={() => onYear(y + 1)} aria-label="Año siguiente">›</button>
        </div>
        <div class="picker-months">
          {MONTHS.map((mm, i) => (
            <button key={mm} class={`pm${i === m ? " sel" : ""}`} onClick={() => onApply(i)}>
              {mm.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleChip({ status, onSync, onDisconnect }: { status: GoogleStatus | null; onSync: () => void; onDisconnect: (id: string) => void }) {
  if (!status) return <div class="gchip dim">…</div>;
  if (!status.configured) return <div class="gchip warn" title="Falta configurar GOOGLE_CLIENT_ID/SECRET en el .env">Google sin configurar</div>;
  if (!status.connected) return <a class="gchip connect" href="/api/google/authorize"><span class="g">G</span> Conectar Google</a>;
  const acc = status.accounts[0];
  return (
    <div class="gchip ok" title={`Sincroniza ${acc.calendarId}`}>
      <span class="dot" />
      <span class="gmail">{acc.email}</span>
      <button class="x" onClick={onSync} aria-label="Sincronizar ahora" title="Sincronizar ahora">⟳</button>
      <button class="x" onClick={() => onDisconnect(acc.id)} aria-label="Desconectar">×</button>
    </div>
  );
}
