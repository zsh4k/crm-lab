# CRM Fenix — Demo

Demo **estática e interactiva** del CRM Fenix, pensada para verse en GitHub Pages
sin necesidad de backend ni base de datos.

### 🔗 Demo en vivo: **https://zsh4k.github.io/crm-demo/**

> **Datos de ejemplo.** Todo lo que ves (clientes, empresas, pipeline, productos,
> pedidos, agenda, tareas) es ficticio y vive **en tu navegador** (localStorage).
> Puedes crear/editar/borrar libremente: los cambios persisten solo en tu equipo.
> Usa el botón **↺ Reiniciar** del banner para restaurar los datos originales.

## ¿Cómo funciona?

El CRM real es un stack **Bun + Hono + Drizzle + PostgreSQL** cuyo frontend
(**Vite + Preact**, mobile-first) habla con la API vía `fetch('/api/...')`.

Como GitHub Pages solo sirve archivos estáticos, esta demo **intercepta `fetch`**
([`src/web/demo/mock-api.ts`](src/web/demo/mock-api.ts)) y resuelve las rutas
`/api/*` contra un almacén en memoria sembrado con datos de ejemplo. El resto del
frontend es idéntico al proyecto real — no se modificó ninguna vista ni la lógica.

Lo único específico de la demo:

- `src/web/demo/mock-api.ts` — API simulada (CRUD en memoria + localStorage).
- `src/web/demo/banner.ts` — banner "DEMO" con botón de reinicio.
- `src/web/main.tsx` — importa los dos módulos anteriores; el service worker queda
  desactivado (bajo el subpath de Pages no aplica).
- `vite.config.ts` — `base: "/crm-demo/"`.

## Qué muestra la demo

- **Inicio** — reloj, citas de hoy/mañana, KPIs y dona de pipeline.
- **Clientes** — contactos por etapa (lead → prospect → customer), tags, buscador,
  detalle con actividad/tareas/pedidos.
- **Pipeline** — oportunidades por etapa y monto.
- **Agenda** — vistas Mes / Semana / Día (la integración con Google aparece como
  *no conectada*, ya que no hay backend).
- **Inventario** — productos con stock, alertas de stock bajo, movimientos.
- **Pedidos** — cotizaciones/pedidos que descuentan stock al entregarse.
- **Configuración** — 10 temas (6 oscuros + 4 claros).

## Desarrollo local

```bash
npm install
npm run build      # genera ./dist (base /crm-demo/)
npx vite preview --base /crm-demo/
```

El deploy a Pages es automático vía [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
en cada push a `main`.

---

Demo derivada del CRM Fenix #48 (proyecto original privado). Este repositorio
contiene el frontend + la capa de datos simulada; el backend real no se incluye.
