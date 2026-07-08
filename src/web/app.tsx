import { useEffect, useState } from "preact/hooks";
import { Inicio } from "./views/inicio";
import { Agenda } from "./views/agenda";
import { Clientes } from "./views/clientes";
import { Pipeline } from "./views/pipeline";
import { Inventario } from "./views/inventario";
import { Pedidos } from "./views/pedidos";
import { Config } from "./views/config";
import { IconInicio, IconAgenda, IconClientes, IconPipeline, IconInventario, IconPedidos, IconConfig } from "./icons";
import type { CrmEvent } from "./lib";

type Tab = "inicio" | "agenda" | "clientes" | "pipeline" | "pedidos" | "inventario" | "config";

const TABS: { id: Tab; label: string; Icon: () => preact.JSX.Element }[] = [
  { id: "inicio", label: "Inicio", Icon: IconInicio },
  { id: "agenda", label: "Agenda", Icon: IconAgenda },
  { id: "clientes", label: "Clientes", Icon: IconClientes },
  { id: "pipeline", label: "Pipeline", Icon: IconPipeline },
  { id: "pedidos", label: "Pedidos", Icon: IconPedidos },
  { id: "inventario", label: "Inventario", Icon: IconInventario },
  { id: "config", label: "Ajustes", Icon: IconConfig },
];

const TAB_IDS = TABS.map((t) => t.id);
const hashTab = (): Tab => {
  const h = location.hash.slice(1) as Tab;
  return TAB_IDS.includes(h) ? h : "inicio";
};

export function App() {
  const [tab, setTab] = useState<Tab>(hashTab);
  const [agendaTarget, setAgendaTarget] = useState<CrmEvent | null>(null);
  useEffect(() => {
    if (location.hash.slice(1) !== tab) location.hash = tab;
  }, [tab]);

  function openCita(ev: CrmEvent) {
    setAgendaTarget(ev);
    setTab("agenda");
  }

  return (
    <div class="app">
      <main class="main">
        {tab === "inicio" && <Inicio onOpenCita={openCita} />}
        {tab === "agenda" && <Agenda target={agendaTarget} onTargetUsed={() => setAgendaTarget(null)} />}
        {tab === "clientes" && <Clientes />}
        {tab === "pipeline" && <Pipeline />}
        {tab === "pedidos" && <Pedidos />}
        {tab === "inventario" && <Inventario />}
        {tab === "config" && <Config />}
      </main>
      <nav class="bottomnav">
        {TABS.map((t) => (
          <button key={t.id} class={`navbtn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <span class="navico"><t.Icon /></span>
            <span class="navlabel">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
