/** Banner flotante que avisa que es una demo con datos ficticios + reset. */
function mount() {
  if (document.getElementById("crm-demo-banner")) return;
  const bar = document.createElement("div");
  bar.id = "crm-demo-banner";
  bar.innerHTML =
    '<span><b>DEMO</b> · datos de ejemplo · sin backend</span>' +
    '<button id="crm-demo-reset" title="Restaurar los datos de ejemplo">↺ Reiniciar</button>';
  Object.assign(bar.style, {
    position: "fixed", left: "50%", bottom: "76px", transform: "translateX(-50%)",
    zIndex: "9999", display: "flex", gap: "10px", alignItems: "center",
    padding: "6px 12px", borderRadius: "999px", font: "500 12px/1.2 system-ui, sans-serif",
    color: "#fff", background: "rgba(20,20,28,.82)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.16)", boxShadow: "0 4px 20px rgba(0,0,0,.35)",
    pointerEvents: "auto", whiteSpace: "nowrap",
  } as CSSStyleDeclaration);
  document.body.appendChild(bar);
  const btn = document.getElementById("crm-demo-reset")!;
  Object.assign(btn.style, {
    cursor: "pointer", border: "1px solid rgba(255,255,255,.25)", background: "transparent",
    color: "#fff", borderRadius: "999px", padding: "3px 8px", font: "inherit",
  } as CSSStyleDeclaration);
  btn.addEventListener("click", () => (window as any).__resetCrmDemo?.());
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
else mount();
