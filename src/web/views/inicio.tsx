import { useEffect, useMemo, useState } from "preact/hooks";
import { api, CrmEvent, Contact, Opportunity, money, fmtTime, sameDay, startOfDay, pushState, enablePush, pushTest, PushState } from "../lib";
import { Logo } from "../logo";
import { IconCampana } from "../icons";
import { useToast, Toast } from "../components";

const STATUS = [
  { id: "open", label: "Abiertas", color: "#22d3ee" },
  { id: "won", label: "Ganadas", color: "#34d399" },
  { id: "lost", label: "Inversiones", color: "#f59e0b" },
];

export function Inicio({ onOpenCita }: { onOpenCita: (e: CrmEvent) => void }) {
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [push, setPush] = useState<PushState>("default");
  const [chartType, setChartType] = useState<"donut" | "bars" | "stacked">("donut");
  const { msg, flash } = useToast();

  // Reloj en vivo.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    pushState().then(setPush);
  }, []);

  async function onEnablePush() {
    const r = await enablePush();
    if (r.ok) {
      setPush("subscribed");
      await pushTest();
      flash("✓ Recordatorios activados");
    } else {
      flash(`✗ ${r.error}`);
    }
  }

  useEffect(() => {
    const today = startOfDay(new Date());
    const from = new Date(today); from.setDate(today.getDate() - 1);
    const to = new Date(today); to.setDate(today.getDate() + 2);
    api.events.list(from.toISOString(), to.toISOString()).then(setEvents);
    api.contacts.list().then(setContacts);
    api.opportunities.list().then(setOpps);
  }, []);

  const today = startOfDay(now);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const contactName = (id?: string | null) => {
    const c = contacts.find((x) => x.id === id);
    return c ? `${c.firstName} ${c.lastName ?? ""}`.trim() : null;
  };
  const onDay = (d: Date) =>
    events.filter((e) => sameDay(new Date(e.startAt), d)).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // Métricas de pipeline.
  const totalBy = (s: string) => opps.filter((o) => o.status === s).reduce((sum, o) => sum + Number(o.amount), 0);
  const countBy = (s: string) => opps.filter((o) => o.status === s).length;
  const openTotal = totalBy("open");
  const wonTotal = totalBy("won");
  const winRate = useMemo(() => {
    const closed = countBy("won") + countBy("lost");
    return closed ? Math.round((countBy("won") / closed) * 100) : 0;
  }, [opps]);
  const segments = STATUS.map((s) => ({ label: s.label, color: s.color, value: totalBy(s.id), count: countBy(s.id) }));
  const pipeTotal = segments.reduce((s, x) => s + x.value, 0);

  const fmtDate = now.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div class="view">
      {/* Reloj con la marca a la izquierda */}
      <div class="clock-card">
        <div class="clock-brand">
          <Logo size={46} />
          <span class="clock-brandname">CRM <span class="dim">Fenix</span></span>
        </div>
        <div class="clock-main">
          <div class="clock-time">{now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}<span class="clock-sec">{now.toLocaleTimeString("es-MX", { second: "2-digit" }).padStart(2, "0")}</span></div>
          <div class="clock-date">{fmtDate}</div>
        </div>
      </div>

      {/* Recordatorios push */}
      {push === "subscribed" ? (
        <div class="notif-on"><IconCampana /> Recordatorios activos <button class="link" onClick={() => { pushTest(); flash("Notificación de prueba enviada"); }}>probar</button></div>
      ) : push === "denied" ? (
        <div class="notif-cta denied">🔕 Notificaciones bloqueadas en el navegador</div>
      ) : push === "unsupported" ? null : (
        <button class="notif-cta" onClick={onEnablePush}><IconCampana /> Activar recordatorios de citas</button>
      )}

      {/* Citas */}
      <h2 class="sec-title">Citas</h2>
      <CitaGroup title="Hoy" events={onDay(today)} contactName={contactName} onClick={onOpenCita} accent />
      <CitaGroup title="Mañana" events={onDay(tomorrow)} contactName={contactName} onClick={onOpenCita} />
      <CitaGroup title="Ayer" events={onDay(yesterday)} contactName={contactName} onClick={onOpenCita} faded />

      {/* Pipeline */}
      <h2 class="sec-title">Pipeline</h2>
      <div class="kpis">
        <div class="kpi"><span class="kpi-val">{money(openTotal)}</span><span class="kpi-lbl">En pipeline (abierto)</span></div>
        <div class="kpi"><span class="kpi-val">{money(wonTotal)}</span><span class="kpi-lbl">Ganado</span></div>
        <div class="kpi"><span class="kpi-val">{winRate}%</span><span class="kpi-lbl">Tasa de cierre</span></div>
      </div>

      <div class="chart-switch">
        {([["donut", "Dona"], ["bars", "Barras"], ["stacked", "Apilada"]] as const).map(([id, lbl]) => (
          <button key={id} class={`cs-btn${chartType === id ? " active" : ""}`} onClick={() => setChartType(id)}>{lbl}</button>
        ))}
      </div>
      <div class="chart-card">
        {pipeTotal > 0 ? (
          <>
            {chartType === "donut" && (
              <div class="donut-wrap">
                <Donut segments={segments} />
                <div class="donut-center"><span class="donut-total">{money(pipeTotal)}</span><span class="donut-lbl">total</span></div>
              </div>
            )}
            {chartType === "bars" && <BarChart segments={segments} />}
            {chartType === "stacked" && <StackedBar segments={segments} total={pipeTotal} />}
            <div class="chart-legend">
              {segments.map((s) => (
                <div key={s.label} class="leg-row">
                  <span class="leg-dot" style={{ background: s.color }} />
                  <span class="leg-label">{s.label}</span>
                  <span class="leg-count">{s.count}</span>
                  <span class="leg-amount">{money(s.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p class="muted" style={{ textAlign: "center", padding: "20px" }}>Sin datos de pipeline todavía.</p>
        )}
      </div>

      <Toast msg={msg} />
    </div>
  );
}

function CitaGroup({ title, events, contactName, onClick, accent, faded }: {
  title: string;
  events: CrmEvent[];
  contactName: (id?: string | null) => string | null;
  onClick: (e: CrmEvent) => void;
  accent?: boolean;
  faded?: boolean;
}) {
  return (
    <div class={`cita-group${faded ? " faded" : ""}`}>
      <div class={`cita-head${accent ? " accent" : ""}`}>{title} <span class="cita-count">{events.length}</span></div>
      {events.length ? (
        events.map((e) => (
          <button key={e.id} class="cita" style={{ borderLeftColor: e.color ?? "#22d3ee" }} onClick={() => onClick(e)}>
            <span class="cita-time">{e.allDay ? "Todo el día" : fmtTime(e.startAt)}</span>
            <span class="cita-title">{e.title}{contactName(e.contactId) ? <span class="dim"> · {contactName(e.contactId)}</span> : null}</span>
          </button>
        ))
      ) : (
        <div class="cita-empty">Sin citas</div>
      )}
    </div>
  );
}

function Donut({ segments, size = 150, thickness = 20 }: { segments: { value: number; color: string }[]; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" stroke-width={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              stroke-width={thickness}
              stroke-dasharray={`${len} ${c - len}`}
              stroke-dashoffset={-offset}
              stroke-linecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}

function BarChart({ segments }: { segments: { label: string; color: string; value: number }[] }) {
  const max = Math.max(...segments.map((s) => s.value), 1);
  return (
    <div class="barchart">
      {segments.map((s) => (
        <div key={s.label} class="bar-row">
          <span class="bar-label">{s.label}</span>
          <div class="bar-track"><div class="bar-fill" style={{ width: `${Math.max((s.value / max) * 100, 2)}%`, background: s.color }} /></div>
          <span class="bar-val">{money(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

function StackedBar({ segments, total }: { segments: { label: string; color: string; value: number }[]; total: number }) {
  return (
    <div class="stackbar-wrap">
      <div class="stackbar">
        {segments.filter((s) => s.value > 0).map((s) => (
          <div key={s.label} class="stack-seg" style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${money(s.value)}`} />
        ))}
      </div>
      <div class="stackbar-scale"><span>0</span><span>{money(total)}</span></div>
    </div>
  );
}
