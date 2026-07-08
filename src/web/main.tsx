// ── DEMO (GitHub Pages) ────────────────────────────────────
// Estos dos imports SOLO existen en el repo de demo. El primero parchea
// `fetch` para servir datos de ejemplo (sin backend); el segundo muestra el
// banner "DEMO". Deben ir ANTES de renderizar la app.
import "./demo/mock-api";
import "./demo/banner";

import { render } from "preact";
import { App } from "./app";
import { initTheme } from "./themes";
import "./styles.css";

initTheme();
render(<App />, document.getElementById("app")!);

// Service worker desactivado en la demo: la ruta absoluta /sw.js no aplica bajo
// el subpath de GitHub Pages (/crm-demo/) y su caché estorbaría al mock.
