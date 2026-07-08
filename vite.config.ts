import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { resolve } from "node:path";

// El frontend vive en src/web y se construye a ./dist, que el server Hono sirve.
export default defineConfig({
  root: "src/web",
  // Servido bajo https://<user>.github.io/crm-lab/ en GitHub Pages.
  base: "/crm-lab/",
  plugins: [preact()],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5184,
    // En dev (vite aparte) proxeamos la API al server Bun.
    proxy: {
      "/api": "http://localhost:3210",
    },
  },
});
