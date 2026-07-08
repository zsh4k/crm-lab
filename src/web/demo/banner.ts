/** Banner flotante que avisa que es una demo con datos ficticios + reset.
 *  Descartable (×, recordado en localStorage) y en la esquina para no tapar
 *  el contenido central (el centro chocaba con el switch del Pipeline). */
const DISMISS_KEY = "crm-demo-banner-dismissed";

function mount() {
  if (document.getElementById("crm-demo-banner")) return;
  try { if (localStorage.getItem(DISMISS_KEY) === "1") return; } catch { /* ignore */ }

  const bar = document.createElement("div");
  bar.id = "crm-demo-banner";
  bar.innerHTML =
    '<span><b>DEMO</b> · datos de ejemplo</span>' +
    '<button id="crm-demo-reset" title="Restaurar los datos de ejemplo">↺</button>' +
    '<button id="crm-demo-x" title="Ocultar" aria-label="Ocultar">✕</button>';
  Object.assign(bar.style, {
    position: "fixed", right: "10px", bottom: "74px",
    zIndex: "9999", display: "flex", gap: "8px", alignItems: "center",
    padding: "6px 10px", borderRadius: "999px", font: "500 12px/1.2 system-ui, sans-serif",
    color: "#fff", background: "rgba(20,20,28,.82)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 4px 20px rgba(0,0,0,.35)",
    pointerEvents: "auto", whiteSpace: "nowrap", maxWidth: "calc(100vw - 20px)",
  } as CSSStyleDeclaration);
  document.body.appendChild(bar);

  const pill = { cursor: "pointer", border: "1px solid rgba(255,255,255,.25)", background: "transparent", color: "#fff", borderRadius: "999px", padding: "2px 8px", font: "inherit" } as CSSStyleDeclaration;
  const reset = document.getElementById("crm-demo-reset")!;
  const close = document.getElementById("crm-demo-x")!;
  Object.assign(reset.style, pill);
  Object.assign(close.style, pill);
  reset.addEventListener("click", () => (window as any).__resetCrmDemo?.());
  close.addEventListener("click", () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    bar.remove();
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
