# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ERP-CRM system for managing electronic accessories in consignment display cases ("vitrinas"). The business places displays in 200+ retail stores; field workers ("colaboradoras") visit stores daily to count inventory, collect payments, and restock. This replaces a fully manual process.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TailwindCSS, shadcn/ui
- **State:** Zustand (global) + TanStack React Query (server data/cache)
- **Backend:** Supabase (PostgreSQL + PostgREST auto-API + Edge Functions on Deno)
- **Auth:** Supabase Auth with JWT + Row Level Security (RLS) per role
- **Storage:** Supabase Storage (visit photos in private bucket)
- **Realtime:** Supabase Realtime websockets (dashboard live updates)
- **Validation:** Zod (client + Edge Functions)
- **Testing:** Vitest (unit/integration) + Playwright (e2e)
- **Hosting:** Vercel (frontend) + Supabase Cloud

## Working Directory

All commands below must be run from `erp-vitrinas/` (the Next.js app root):

```bash
cd erp-vitrinas
```

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint / Type check / Format
npm run lint
npm run type-check        # tsc --noEmit
npm run format            # prettier --write .

# Tests (Vitest + Playwright — install devDeps first if not present)
npm run test              # Vitest unit tests
npm run test:e2e          # Playwright e2e
npx vitest run <file>     # Single test file

# Supabase types (run after schema changes)
supabase gen types typescript --local > lib/supabase/database.types.ts

# Supabase local development
supabase start
supabase db reset         # Reset local DB + run migrations
supabase migration new <name>
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Public key (client-side)
SUPABASE_SERVICE_ROLE_KEY      # Service key (server/Edge Functions only)
NEXT_PUBLIC_APP_URL            # Base URL for auth redirects
SUPABASE_DB_PASSWORD           # Direct PostgreSQL password (migrations/CI)
STORAGE_BUCKET_FOTOS           # Supabase Storage bucket name for photos
```

## Project Structure

The repo root contains planning docs (`ERP_CRM_Plan_v2.md`, `SPRINTS.md`, `docs/`). All application code lives under `erp-vitrinas/`:

```
erp-vitrinas/
  app/
    (admin)/      # Admin panel routes → served at /admin/*
    (campo)/      # Field worker routes → served at /campo/*
    login/        # Public login page
  components/
    ui/           # shadcn/ui base components
    admin/        # Admin-only components
    campo/        # Field worker-only components
  lib/
    supabase/     # Supabase clients (client.ts, server.ts) + database.types.ts
    hooks/        # Custom React hooks (all data fetching goes here)
    validations/  # Zod schemas per domain
  middleware.ts   # Auth guard + role-based redirect
  supabase/
    migrations/   # Versioned SQL migrations (all schema changes here)
    functions/    # Edge Functions (Deno)
  tests/          # Playwright e2e tests
```

## Architecture

### Two distinct UIs
- **`(admin)` group:** Desktop panel for admins, supervisors, analysts, purchasing. Full CRUD, dashboards, reports.
- **`(campo)` group:** Mobile-first PWA for field workers. Simplified visit flow: count → calculate → collect → restock.

### Data flow rule
No direct Supabase/fetch calls in components. All data logic lives in hooks (`lib/hooks/`) or Server Actions. Components consume hooks only.

### Inventory model
Inventory movements (`movimientos_inventario`) are **immutable** — never deleted, only new records created. Current stock is denormalized into `inventario_vitrina` and `inventario_central` via PostgreSQL triggers. The core visit calculation: `unidades_vendidas = inv_anterior - inv_actual`.

### RLS (Row Level Security)
Every table has RLS policies enforcing role-based access. Key rules:
- `colaboradora`: reads/writes only her own visits (`colaboradora_id = auth.uid()`)
- `admin`: full access everywhere
- `supervisor`: read on routes, visits, incidents; CRUD on incidents
- `analista`: read-only on all data and reports
- `compras`: CRUD on suppliers, purchases, and central inventory

The `usuarios` table links to `auth.uid()` and its `rol` column drives all RLS policies. The middleware reads role from `user.app_metadata.rol` (set via Supabase Auth hook, not from the `usuarios` table directly).

### Offline support (PWA)
The `(campo)` view uses a service worker with IndexedDB to cache the day's route and vitrina inventory. Visits recorded offline sync automatically on reconnect.

## Roles

| Role | Interface |
|------|-----------|
| `admin` | Full admin panel |
| `colaboradora` | Mobile campo view (her route only) |
| `supervisor` | Admin panel (routes, visits, incidents, partial reports) |
| `analista` | Admin panel (read-only, dashboards, exports) |
| `compras` | Admin panel (suppliers, purchases, central inventory) |

## Code Conventions

- **TypeScript strict mode** (`strict: true`). No explicit `any`.
- **Naming:** Components → PascalCase; hooks → `useXxx`; utils → camelCase; constants → `UPPER_SNAKE_CASE`; SQL tables → `snake_case` plural; Next.js routes → `kebab-case`.
- **Files:** Components → `PascalCase.tsx`; utils → `camelCase.ts`.
- **Comments:** Business logic in Spanish; infrastructure/technical code in English.
- Supabase types are generated — always regenerate after schema changes.

## Git Workflow

- `main` = production; `develop` = integration branch.
- Feature branches: `feature/HU-XX-descripcion-corta`
- Commit format: `feat:`, `fix:`, `chore:`, `docs:`, `test:` + Spanish description.
- No direct push to `main` or `develop`. PRs require 1 reviewer + passing CI.

## Key Business Rules

1. A visit cannot be closed without a registered payment amount.
2. If collected amount differs from calculated amount, a note is mandatory and the payment record enters `discrepancia` state.
3. Stock cannot go negative — enforced by a `validar_stock_no_negativo()` trigger.
4. An incident cannot be closed without a registered resolution.
5. Inactive products must not appear in restock options.
6. First visit to a new vitrina uses `inv_anterior = 0` for all products.

## Key SQL Triggers & Functions

| Name | Purpose |
|------|---------|
| `set_updated_at()` | Auto-updates `updated_at` on all tables |
| `calcular_unidades_vendidas()` | Before insert on `detalle_visita`: sets `unidades_vendidas = inv_anterior - inv_actual` |
| `actualizar_inventario()` | After insert on `movimientos_inventario`: updates denormalized stock |
| `validar_stock_no_negativo()` | Before insert on `movimientos_inventario`: throws if result < 0 |
| `calcular_monto_visita()` | SQL function: sums subtotals from `detalle_visita` |
| `get_kpi_ventas(fecha_inicio, fecha_fin)` | SQL function: returns KPIs grouped by route, worker, PDV |
