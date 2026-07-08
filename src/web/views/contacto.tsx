import { useEffect, useState } from "preact/hooks";
import { api, money, type Activity, type Task, type Order, type Contact } from "../lib";

const ACT: Record<string, { l: string; i: string }> = {
  note: { l: "Nota", i: "📝" },
  call: { l: "Llamada", i: "📞" },
  email: { l: "Email", i: "✉️" },
  meeting: { l: "Reunión", i: "🤝" },
  whatsapp: { l: "WhatsApp", i: "💬" },
  system: { l: "Sistema", i: "⚙️" },
};
const MANUAL = ["note", "call", "email", "meeting", "whatsapp"];
const ORDER_STATUS: Record<string, { l: string; c: string }> = {
  quote: { l: "Cotización", c: "#7c8aa3" },
  confirmed: { l: "Confirmado", c: "#60a5fa" },
  fulfilled: { l: "Entregado", c: "#34d399" },
  cancelled: { l: "Cancelado", c: "#f43f5e" },
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const isOverdue = (t: Task) => !!t.dueAt && !t.done && new Date(t.dueAt) < new Date();

export function ContactoDetalle({
  contact,
  companyName,
  stageMeta,
  onBack,
  onEdit,
}: {
  contact: Contact;
  companyName?: string;
  stageMeta: (id: string) => { color: string; label: string };
  onBack: () => void;
  onEdit: () => void;
}) {
  const id = contact.id;
  const [acts, setActs] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [actType, setActType] = useState("note");
  const [actBody, setActBody] = useState("");
  const [editAct, setEditAct] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");

  const reloadActs = async () => setActs(await api.activities.list(`?contactId=${id}`));
  const reloadTasks = async () => setTasks(await api.tasks.list(`?contactId=${id}`));
  useEffect(() => {
    reloadActs();
    reloadTasks();
    api.orders.list(`?contactId=${id}`).then(setOrders);
  }, [id]);

  async function addAct() {
    const body = actBody.trim();
    if (!body) return;
    await api.activities.create({ contactId: id, type: actType, body } as Partial<Activity>);
    setActBody("");
    setActType("note");
    await reloadActs();
  }
  async function saveAct(aid: string) {
    const body = editBody.trim();
    if (!body) return;
    await api.activities.update(aid, { body });
    setEditAct(null);
    await reloadActs();
  }
  async function delAct(aid: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    await api.activities.remove(aid);
    await reloadActs();
  }
  async function addTask() {
    const title = taskTitle.trim();
    if (!title) return;
    await api.tasks.create({ contactId: id, title, dueAt: taskDue ? new Date(taskDue).toISOString() : null } as Partial<Task>);
    setTaskTitle("");
    setTaskDue("");
    await reloadTasks();
  }
  async function toggleTask(t: Task) {
    await api.tasks.update(t.id, { done: !t.done });
    await reloadTasks();
  }
  async function delTask(tid: string) {
    await api.tasks.remove(tid);
    await reloadTasks();
  }

  return (
    <div class="view">
      <header class="topbar">
        <button class="ghost" style={{ whiteSpace: "nowrap" }} onClick={onBack}>← Volver</button>
        <button class="primary sm" onClick={onEdit}>Editar</button>
      </header>

      <div class="detail-head">
        <div class="detail-title">
          <strong>{contact.firstName} {contact.lastName ?? ""}</strong>
          <span class="badge" style={{ background: stageMeta(contact.stage).color }}>{stageMeta(contact.stage).label}</span>
        </div>
        {contact.title && <div class="muted">{contact.title}</div>}
        {companyName && <div class="muted">🏢 {companyName}</div>}
        <div class="card-meta">
          {contact.email && <span>✉ {contact.email}</span>}
          {contact.phone && <span>☎ {contact.phone}</span>}
        </div>
        {contact.tags && contact.tags.length > 0 && <div class="tags">{contact.tags.map((t) => <span key={t} class="tag">{t}</span>)}</div>}
      </div>

      <h3 class="sec-title">Tareas y follow-ups</h3>
      <div class="addrow">
        <input
          class="grow"
          placeholder="Nueva tarea / follow-up…"
          value={taskTitle}
          onInput={(e) => setTaskTitle((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
        />
        <input type="datetime-local" value={taskDue} onInput={(e) => setTaskDue((e.target as HTMLInputElement).value)} />
        <button class="primary sm" onClick={addTask}>+</button>
      </div>
      {tasks.length === 0 ? (
        <p class="muted small">Sin tareas.</p>
      ) : (
        <div class="tasklist">
          {tasks.map((t) => (
            <div key={t.id} class={`taskrow${t.done ? " done" : ""}`}>
              <button class="check" onClick={() => toggleTask(t)} aria-label="completar">{t.done ? "✓" : ""}</button>
              <span class="task-title">{t.title}</span>
              {t.dueAt && <span class={`task-due${isOverdue(t) ? " over" : ""}`}>{fmtDateTime(t.dueAt)}</span>}
              <button class="linkbtn" onClick={() => delTask(t.id)} aria-label="eliminar">×</button>
            </div>
          ))}
        </div>
      )}

      <h3 class="sec-title">Actividad</h3>
      <div class="addrow">
        <select value={actType} onChange={(e) => setActType((e.target as HTMLSelectElement).value)}>
          {MANUAL.map((k) => <option key={k} value={k}>{ACT[k].i} {ACT[k].l}</option>)}
        </select>
        <input
          class="grow"
          placeholder="Registrar nota, llamada, mensaje…"
          value={actBody}
          onInput={(e) => setActBody((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === "Enter") addAct(); }}
        />
        <button class="primary sm" onClick={addAct}>+</button>
      </div>
      {acts.length === 0 ? (
        <p class="muted small">Sin actividad registrada.</p>
      ) : (
        <div class="timeline">
          {acts.map((a) => (
            <div key={a.id} class="tl-item">
              <span class="tl-ico">{ACT[a.type]?.i ?? "•"}</span>
              <div class="tl-body">
                {editAct === a.id ? (
                  <div class="addrow">
                    <input class="grow" value={editBody} onInput={(e) => setEditBody((e.target as HTMLInputElement).value)} autofocus />
                    <button class="primary sm" onClick={() => saveAct(a.id)}>✓</button>
                  </div>
                ) : (
                  <span class="tl-text">{a.body}</span>
                )}
                <div class="tl-meta">
                  <span class="muted small">{ACT[a.type]?.l ?? a.type} · {fmtDateTime(a.createdAt)}</span>
                  {a.type !== "system" && editAct !== a.id && (
                    <button class="linkbtn" onClick={() => { setEditAct(a.id); setEditBody(a.body); }}>editar</button>
                  )}
                  <button class="linkbtn" onClick={() => delAct(a.id)}>eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 class="sec-title">Pedidos</h3>
      {orders.length === 0 ? (
        <p class="muted small">Sin pedidos. Crealos en la pestaña Pedidos.</p>
      ) : (
        <div class="cards">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.quote;
            return (
              <div key={o.id} class="card">
                <div class="card-top">
                  <strong>{money(o.total, o.currency)}</strong>
                  <span class="badge" style={{ background: st.c }}>{st.l}</span>
                </div>
                <div class="muted small">{fmtDateTime(o.createdAt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
