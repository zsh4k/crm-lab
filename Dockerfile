# CRM FENIX — imagen única que sirve API (Hono) + SPA (Vite build) en un solo puerto.
FROM oven/bun:1-debian

WORKDIR /app

# Deps primero para cachear capa de instalación.
COPY package.json bun.lockb* ./
RUN bun install

# Código (incluye migraciones versionadas en ./drizzle) + build del frontend.
COPY . .
RUN bun run build

EXPOSE 3210

# Aplica migraciones versionadas (no-interactivo) y arranca el server.
CMD ["sh", "-c", "bun run db:migrate && bun run src/server/index.ts"]
