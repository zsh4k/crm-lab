// Temas alternativos del CRM. El tema "cyberpunk" es el predeterminado actual
// y se mantiene; los demás son ADITIVOS, generados con el motor de color matiz
// (Fenix #49): escala OKLCH dark de bajo chroma para los neutros + accent +
// accent-2 por armonía split-complementary. No reemplazan el diseño actual.

export interface Theme {
  id: string;
  name: string;
  /** Overrides de CSS custom properties sobre :root. */
  vars: Record<string, string>;
}

const VAR_KEYS = ["--bg", "--bg-2", "--panel", "--line", "--dim", "--txt", "--accent", "--accent-2", "--glow"];

export const THEMES: Theme[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    vars: {
      "--bg": "#0a0e16",
      "--bg-2": "#111827",
      "--panel": "#0f1626",
      "--line": "#1f2a3d",
      "--dim": "#7c8aa3",
      "--txt": "#e5edf7",
      "--accent": "#22d3ee",
      "--accent-2": "#a855f7",
      "--glow": "0 0 12px rgba(34, 211, 238, 0.35)",
    },
  },
  {
    id: "esmeralda",
    name: "Esmeralda",
    vars: {
      "--bg": "#101110",
      "--bg-2": "#212322",
      "--panel": "#181a19",
      "--line": "#313633",
      "--dim": "#67726c",
      "--txt": "#dbece3",
      "--accent": "#10b981",
      "--accent-2": "#bd7fdf",
      "--glow": "0 0 12px rgba(16, 185, 129, 0.35)",
    },
  },
  {
    id: "ambar",
    name: "Ámbar",
    vars: {
      "--bg": "#111110",
      "--bg-2": "#242221",
      "--panel": "#1a1918",
      "--line": "#373430",
      "--dim": "#756d65",
      "--txt": "#f1e5d8",
      "--accent": "#f59e0b",
      "--accent-2": "#00c7f1",
      "--glow": "0 0 12px rgba(245, 158, 11, 0.35)",
    },
  },
  {
    id: "magenta",
    name: "Magenta",
    vars: {
      "--bg": "#111011",
      "--bg-2": "#252223",
      "--panel": "#1a1919",
      "--line": "#383335",
      "--dim": "#776b6f",
      "--txt": "#f4e1e8",
      "--accent": "#ec4899",
      "--accent-2": "#00af28",
      "--glow": "0 0 12px rgba(236, 72, 153, 0.35)",
    },
  },
  {
    id: "oceano",
    name: "Océano",
    vars: {
      "--bg": "#101111",
      "--bg-2": "#222325",
      "--panel": "#18191a",
      "--line": "#323539",
      "--dim": "#696f79",
      "--txt": "#dfe8f6",
      "--accent": "#3b82f6",
      "--accent-2": "#d26200",
      "--glow": "0 0 12px rgba(59, 130, 246, 0.35)",
    },
  },
  {
    id: "violeta",
    name: "Violeta",
    vars: {
      "--bg": "#111111",
      "--bg-2": "#232225",
      "--panel": "#19191a",
      "--line": "#353438",
      "--dim": "#6f6d78",
      "--txt": "#e7e5f5",
      "--accent": "#8b5cf6",
      "--accent-2": "#a67900",
      "--glow": "0 0 12px rgba(139, 92, 246, 0.35)",
    },
  },
  // ── Temas claros (light) ───────────────────────────────────────────
  {
    id: "claro",
    name: "Claro",
    vars: {
      "--bg": "#fcfcfd",
      "--bg-2": "#eff1f4",
      "--panel": "#f7f8fa",
      "--line": "#dadde2",
      "--dim": "#576070",
      "--txt": "#282e39",
      "--accent": "#2563eb",
      "--accent-2": "#ad5400",
      "--glow": "0 0 12px rgba(37, 99, 235, 0.22)",
    },
  },
  {
    id: "marfil",
    name: "Marfil",
    vars: {
      "--bg": "#fdfcfb",
      "--bg-2": "#f3f0ee",
      "--panel": "#f9f7f6",
      "--line": "#e1dcd8",
      "--dim": "#6c5c4f",
      "--txt": "#362b23",
      "--accent": "#d97706",
      "--accent-2": "#00a7b9",
      "--glow": "0 0 12px rgba(217, 119, 6, 0.22)",
    },
  },
  {
    id: "menta",
    name: "Menta",
    vars: {
      "--bg": "#fbfdfc",
      "--bg-2": "#eef2f0",
      "--panel": "#f6f8f7",
      "--line": "#d9dfdb",
      "--dim": "#51655b",
      "--txt": "#24312b",
      "--accent": "#059669",
      "--accent-2": "#9a66b4",
      "--glow": "0 0 12px rgba(5, 150, 105, 0.22)",
    },
  },
  {
    id: "nieve",
    name: "Nieve",
    vars: {
      "--bg": "#fbfdfd",
      "--bg-2": "#eef1f3",
      "--panel": "#f6f8f9",
      "--line": "#d9dee2",
      "--dim": "#51626e",
      "--txt": "#242f38",
      "--accent": "#0284c7",
      "--accent-2": "#c15845",
      "--glow": "0 0 12px rgba(2, 132, 199, 0.22)",
    },
  },
];

const STORAGE_KEY = "crm-theme";
const DEFAULT_ID = "cyberpunk";

export function currentThemeId(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_ID;
}

/** Aplica un tema seteando las CSS vars en :root. El predeterminado limpia los overrides. */
export function applyTheme(id: string): void {
  const theme = THEMES.find((t) => t.id === id) ?? THEMES[0];
  const root = document.documentElement;
  if (theme.id === DEFAULT_ID) {
    for (const key of VAR_KEYS) root.style.removeProperty(key);
  } else {
    for (const [key, value] of Object.entries(theme.vars)) root.style.setProperty(key, value);
  }
  localStorage.setItem(STORAGE_KEY, theme.id);
}

/** Aplica el tema guardado al arrancar (evita flash). */
export function initTheme(): void {
  applyTheme(currentThemeId());
}
