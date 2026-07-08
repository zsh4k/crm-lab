---
tags: [fenix, bitacora, decisiones]
---

# CRM Fenix — Bitácora de decisiones

> Append-only.

## 2026-05-26 — scaffold inicial

Repo creado vía `fenix_new.sh`. Vault con 4 notas canónicas, symlink desde Obsidian.

## 2026-05-26 — decisiones de arranque (confirmadas con el usuario)

- **Stack:** Bun + Hono + Drizzle + PostgreSQL (elegido sobre Rust/híbrido y sobre SQLite).
- **Sync Google:** bidireccional por **polling** (no webhooks).
- **Orden de construcción:** **agenda + sync Google primero**, luego CRM e inventario.

## 2026-05-26 — local-first / Google-opcional (aclaración del usuario)

> "el calendario debe ser compatible con google pero que no dependa de google".

El diseño ya lo cumple: eventos en PostgreSQL, campos `google*` nullable, `syncStatus`
arranca en `local`. Verificado: CRUD de eventos funciona con `configured:false`. Se elevó a
principio de diseño de primer nivel (README + arquitectura).

## 2026-05-26 — slice agenda + OAuth2 funcionando

- Stack levantado: `crm-api :3210` + `crm-postgres :5440`. Health ok, migraciones aplicadas.
- CRUD de eventos verificado end-to-end.
- OAuth2 "una vez" implementado: `access_type=offline` + `prompt=consent` → refresh_token
  cifrado. Authorize URL verificada con creds de prueba (parámetros correctos).
- **Gotcha resuelto:** `drizzle-kit push` es interactivo y cuelga en container no-TTY
  (mostró `❯ No, abort` y abortó). Cambiado a `db:generate` (build) + `db:migrate` (arranque),
  ambos no-interactivos + historial versionado.

## 2026-05-26 — barrido completo ("ponle todo lo que falte") + QA

Construido en una sesión, todo verificado:
- **Motor de sync bidireccional por polling:** `google/calendar.ts` (REST v3) + `google/sync.ts`
  (push de pendientes → pull incremental con `syncToken`, 410→resync, soft-delete, `sync_log`) +
  `sync/worker.ts` (polling configurable, no-op sin creds) + rutas `POST /sync` y `GET /sync/log`.
- **API CRM:** contacts (con stages + tags), companies, opportunities (pipeline por estado).
- **API inventario:** products (SKU único), categories, movements con **ajuste de stock
  transaccional** (in/out/adjust, valida stock no-negativo).
- **Frontend:** shell con bottom-nav mobile-first + 4 vistas (Agenda/Clientes/Pipeline/Inventario)
  + vínculo evento↔contacto + deep-link por hash. **PWA** (manifest + sw stale-while-revalidate + icon).
- **Tests:** `bun test` 9/9 (crypto roundtrip+tamper, authorize URL offline/consent, mapping sync).

QA sostenido: typecheck limpio, integración de las 6 entidades, lógica de stock, 404/400/409,
E2E de UI con lupa (click→modal→guardar→persiste). 1 bug corregido (cast de tipo en inventario.tsx).

**Decisiones diferidas al usuario** (no se adivinaron): (1) modelo de **autenticación** de usuarios
(mono-usuario vs equipo) y (2) **exposición pública** en aduana + DNS (modifica infra compartida).

## 2026-05-27 — Inicio, vistas semana/día, Web Push, logo laberinto

- **Página Inicio** (nuevo tab por defecto): reloj en vivo + citas hoy/mañana/ayer (ayer desvanecido)
  + KPIs y donut SVG de Pipeline. Tab "Inicio" (casa) agregado al nav (ahora 5).
- **Agenda Semana/Día:** selector de vista; semana = secciones por día, día = lista por hora.
  Navegación y rango de carga mode-aware. Para "varias notas/actividades por día".
- **Web Push en el CRM:** `push_subscriptions` + VAPID propias + `/api/push/*` + worker de
  recordatorios (push 10 min antes de cada evento, marca `reminded_at`) + handlers `push`/
  `notificationclick` en el SW + botón "Activar recordatorios" en Inicio. VAPID en `.env` (gitignored).
- **Logo:** rombo simple → **rombo con laberinto** (componente [[logo]] + icon.svg PWA) en todos los topbars.
- **Clientes:** descripción de cada etapa (leyenda desplegable + hint en el modal).
- Migración **0001** (push_subscriptions + events.reminded_at).

## 2026-05-27 — refinamientos de UI (segunda tanda)

- **Reloj:** números en contorno (`-webkit-text-stroke`) + logo tileado adentro; luego la marca
  (logo + CRM Fenix) se movió **adentro del cuadro de hora, a la izquierda**, y los números
  quedaron solo en contorno.
- **Inicio:** selector de tipo de gráfica (**dona / barras / apilada**); las **citas son
  clickeables** → abren la Agenda en vista Día con el evento (App pasa `target` a Agenda).
- **Pipeline:** "Perdidas" → **"Inversiones"** (label + color ámbar).
- **Clientes:** al filtrar por una etapa muestra **solo** el significado de esa etapa; **editor
  de etiquetas** por contacto (chips + Enter/coma; `save()` captura la etiqueta tipiada).
- **Modal:** header fijo + cuerpo scrolleable + acciones fijas → la barra ya no tapa contenido.
- **Agenda Semana en escritorio:** grilla de 7 columnas de igual altura + eventos apilados (sin recorte).
- **Fix:** id de gradiente del logo **único por instancia** (colisión hacía que el logo "se
  apagara" al cambiar de vista).

## 2026-05-27 — sección Configuraciones + selector de temas (integración matiz)

- Nueva sección **Configuraciones** (6º tab del bottom-nav, ícono engrane) con un **selector de temas**.
- **10 temas** generados con el motor de color [[matiz]] (Fenix #49): **6 oscuros** (Cyberpunk = el actual/predeterminado, NO se reemplaza · Esmeralda · Ámbar · Magenta · Océano · Violeta) + **4 claros/white** (Claro · Marfil · Menta · Nieve). Neutros = escala OKLCH (dark o light, bajo chroma) + accent + accent-2 por armonía split-complementary.
- Aplica seteando CSS vars en `:root` (el predeterminado limpia los overrides); persiste en `localStorage` (`crm-theme`); se aplica en el arranque (`initTheme()` en main.tsx) sin flash.
- **Para que los temas claros funcionen** se quitaron 3 colores hardcodeados oscuros (fondo del body, fondo del bottom-nav, glow del clock-card) y se pasaron a `color-mix(... var(--accent)/var(--bg) ...)` para que adapten al tema.
- Aditivo: el diseño actual del CRM se mantiene como default. El logo conserva su gradiente de marca fijo; los colores semánticos (won/open/inversiones) no cambian con el tema.
- Verificado con lupa: switch a Esmeralda (oscuro) y a Claro (white) recolorea toda la app, legible, y persiste.

## 2026-05-27 — Pedidos, timeline de actividad y tareas (cierra el ciclo ventas↔inventario)

Tras un análisis comparativo vs otros CRM (huecos Tier-2), se construyó:

- **Pedidos / cotizaciones** (nuevo tab + ícono recibo): `orders` + `order_items`. Estados quote→confirmed→fulfilled→cancelled. **Une clientes ↔ inventario**: al pasar a *fulfilled* descuenta stock (movimientos `out` transaccionales); al des-entregar/cancelar/borrar **repone** stock (`in`). Snapshot de nombre/precio por ítem. PATCH revierte-y-reaplica para editar pedidos entregados de forma segura.
- **Timeline de actividad por contacto:** `activities` (note/call/email/meeting/whatsapp/system). Auto-log de sistema al crear/cambiar estado de un pedido y al **cambiar la etapa** del contacto.
- **Tareas / follow-ups:** `tasks` (título + `due_at` + done + completedAt). Pendientes primero, por vencimiento; vencidas en rojo.
- **UI:** vista **Pedidos** (CRUD con line-items + Total en vivo + "Entregar") + **detalle de contacto** (click en Clientes → Tareas/Actividad/Pedidos, con alta/edición/borrado inline) + **buscador** de contactos (usa el `q` que ya existía). Nav a 7 columnas.
- **Migración 0002** (orders/order_items/activities/tasks + enums order_status/activity_type).

Testing (lo pidió el usuario, "llenado/modificaciones/eliminado"):
- **21/21** checks de integración HTTP contra la API en vivo: CRUD de pedidos + lógica de stock (descuenta/repone/rechaza insuficiente), CRUD de actividades (incl. auto-log), CRUD de tareas, y auto-log de cambio de etapa.
- `bun test` 9/9 (unit) sigue verde. `tsc --noEmit` limpio.
- E2E con lupa: modal de pedido, detalle de contacto, y alta de tarea + actividad por UI verificados.

## Pendiente

- Conectar credenciales OAuth reales de Google Cloud para validar el sync en vivo.
- Auth + exposición pública (esperan decisión del usuario).
- Recordatorios configurables por evento (`event_reminders` ya en schema).
