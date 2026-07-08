import { useState } from "preact/hooks";
import { IconConfig } from "../icons";
import { THEMES, applyTheme, currentThemeId } from "../themes";

const PREVIEW_VARS = ["--bg", "--accent", "--accent-2", "--txt", "--line"];

export function Config() {
  const [active, setActive] = useState(currentThemeId());

  function pick(id: string) {
    applyTheme(id);
    setActive(id);
  }

  return (
    <div>
      <header class="topbar">
        <div class="brand"><IconConfig /> Configuraciones</div>
      </header>

      <h2 class="sec-title">Tema</h2>
      {/* Info interna (no mostrar al usuario): el tema actual (Cyberpunk) se mantiene como
          predeterminado; los demás son alternativos, generados con el motor de color matiz
          (escalas OKLCH + armonía + contraste APCA). */}
      <p class="cfg-hint">Elige el aspecto de la aplicación. Hay temas oscuros y claros; tu elección se guarda en este dispositivo.</p>

      <div class="theme-grid">
        {THEMES.map((t) => (
          <button
            key={t.id}
            class={`theme-card${active === t.id ? " active" : ""}`}
            onClick={() => pick(t.id)}
            style={{ background: t.vars["--panel"], borderColor: active === t.id ? t.vars["--accent"] : t.vars["--line"] }}
          >
            <div class="theme-head">
              <span class="theme-name" style={{ color: t.vars["--txt"] }}>
                {t.name}
                {t.id === "cyberpunk" && <span class="theme-default"> · default</span>}
              </span>
              {active === t.id && <span class="theme-check" style={{ color: t.vars["--accent"] }}>✓</span>}
            </div>
            <div class="theme-preview" style={{ background: t.vars["--bg"], borderColor: t.vars["--line"] }}>
              <span class="theme-chip" style={{ background: t.vars["--accent"], color: t.vars["--bg"] }}>Aa</span>
              <span class="theme-txt" style={{ color: t.vars["--txt"] }}>Texto</span>
              <span class="theme-txt dim" style={{ color: t.vars["--dim"] }}>secundario</span>
              <span class="theme-dot" style={{ background: t.vars["--accent-2"] }} />
            </div>
            <div class="theme-swatches">
              {PREVIEW_VARS.map((v) => (
                <span key={v} class="theme-sw" style={{ background: t.vars[v] }} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
