---
tags: [fenix, arquitectura]
---

# CRM Fenix — Arquitectura

> Agenda local-first en PostgreSQL; Google Calendar es una capa de sync opcional y desacoplable que nunca es un punto de falla del calendario.

## Estructura del repo

```
crm/
  docker-compose.yml      # crm-postgres (16) + crm-api (Bun, front-door único)
  Dockerfile              # oven/bun: install → db:generate → vite build → migrate+serve
  drizzle.config.ts
  drizzle/                # migraciones SQL versionadas (generadas)
  src/
    server/
      index.ts            # Hono: monta /api/* + sirve la SPA + arranca worker de sync
      db/{schema,client}.ts
      lib/{env,crypto}.ts # crypto = AES-256-GCM (patrón locky)
      google/{oauth,tokens,calendar,sync}.ts   # OAuth + REST v3 + engine pull/push
      sync/worker.ts      # polling configurable (no-op sin creds)
      routes/{health,events,google,contacts,companies,opportunities,categories,products,movements}.ts
    web/                  # Vite + Preact, shell + bottom-nav
      {index.html,main.tsx,app.tsx,lib.ts,components.tsx,styles.css}
      views/{agenda,clientes,pipeline,inventario}.tsx
      public/{manifest.webmanifest,sw.js,icon.svg}   # PWA
```

## Flujo

```mermaid
flowchart LR
  UI[SPA Preact] -->|/api/events| API[Hono]
  API --> PG[(PostgreSQL)]
  UI -->|Conectar| AUTH[/api/google/authorize]
  AUTH --> G[Google consent]
  G -->|code| CB[/api/google/callback]
  CB -->|tokens cifrados| PG
  SYNC[worker polling 🔜] -->|pull syncToken / push pending| G
  SYNC --> PG
```

## Decisiones técnicas

- **Local-first / Google-opcional.** Todos los campos `google*` de `events` son nullable y
  `syncStatus` arranca en `local`. El calendario opera sin Google; conectar/desconectar no
  toca los eventos. Google es integración, no dependencia.
- **OAuth2 "una vez".** `access_type=offline` + `prompt=consent` → `refresh_token`, que se
  guarda cifrado. `getValidAccessToken()` renueva el access_token solo cuando vence (margen 60s).
- **Tokens cifrados at-rest.** AES-256-GCM (scrypt N=2^15 + IV 12B + authTag), formato
  `salt:iv:tag:ciphertext` en base64. Reuso del patrón de [[07-locky/00-overview|locky]].
- **OAuth con `fetch` puro.** Evita el bundle gigante de `googleapis`; el flujo son 3-4 POSTs.
- **Drizzle + migraciones versionadas.** Primero del workspace en usar Drizzle (el resto usa
  SQL crudo). Justificado: el schema de un CRM evoluciona y necesita migraciones tipadas.
- **`generate` en build + `migrate` al arrancar.** `drizzle-kit push` es **interactivo** y
  cuelga en container no-TTY; `migrate` es no-interactivo y deja historial versionado.
- **Front-door único.** Hono sirve la API y la SPA buildeada (`./dist`) en el mismo puerto.

## Anti-patterns evitados

- No depender de Google para que el calendario funcione (sería un punto de falla externo).
- No guardar tokens OAuth en claro ni en repos.
- No usar `drizzle-kit push` en el arranque del container (interactivo → cuelga).
- No bindear `localhost`: el server escucha en `0.0.0.0`.
