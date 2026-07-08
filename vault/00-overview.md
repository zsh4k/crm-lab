---
tags: [fenix]
repo: monsterbunx/crm
gitea: http://127.0.0.1:3080/monsterbunx/crm
status: en-construcción
---

# CRM Fenix

> CRM ligero y moderno: clientes/prospectos, inventario y **agenda local-first** sincronizable (opcionalmente) con Google Calendar.

## ¿Qué es?

Fenix #48. Un CRM compuesto inspirado en las CRMs ligeras y modernas de GitHub (Twenty,
Monica, EspoCRM) pero con stack propio del workspace. Tres dominios: **clientes/prospectos**,
**inventario** y **agenda**. La agenda es lo primero construido y es **local-first**: vive en
PostgreSQL y funciona sin Google; Google Calendar es una capa de sync **opcional y desacoplable**.

## Stack

- **Backend:** Bun + Hono + Drizzle ORM (migraciones versionadas) — `:3210`.
- **DB:** PostgreSQL 16 — `:5440`.
- **Frontend:** Vite + Preact, mobile-first 375×666, paleta cyberpunk, front-door único.
- **Google:** OAuth2 con `fetch` puro (sin SDK `googleapis`). Tokens cifrados AES-256-GCM.

## Estado MVP

Hoy (todo verificado con tests + QA):
- Agenda local-first: calendario mensual + CRUD de eventos (sin dependencia de Google).
- OAuth2 "una vez" + motor de **sync bidireccional por polling** (pull `syncToken` + push pendientes + `sync_log`).
- CRM: companies / contacts (stages) / opportunities (pipeline). Inventario: products + categorías + movimientos (stock transaccional).
- Shell mobile-first 4 vistas + PWA instalable. `bun test` 9/9 + typecheck limpios.

Pendiente de decisión del usuario:
- Autenticación de usuarios (mono-usuario vs equipo).
- Exposición pública en aduana + DNS.

## Links

- Repo: http://127.0.0.1:3080/monsterbunx/crm
- [[48-crm/01-architecture]]
- [[48-crm/02-tools]]
- [[48-crm/03-decisiones]]
