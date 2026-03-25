<div align="center">

# ruteria

**A field service management platform for consignment retail networks**

Built to manage the full visit workflow across **200+ retail locations**: routes, inventory counts, collections, replenishment, and admin oversight.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=black)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

## Overview

`ruteria` is a production-style FSM platform for a consignment business operating physical display cases inside third-party stores.

It replaces manual coordination with a structured system for:

- route planning and daily field execution
- inventory counting and inferred sales
- payment registration and discrepancy handling
- replenishment from central stock to field staff to display cases
- admin visibility into visits, stock, guarantees, purchasing, and analytics

This is one of my strongest portfolio projects because it combines product thinking, operational domain modeling, backend integrity, and end-to-end ownership.

## Highlights

- Mobile-first workflow for field collaborators
- Role-based admin and field experiences
- SQL triggers and RPCs for transactional inventory logic
- Offline-first field execution with sync queue and image compression
- Dashboard and exportable reports for operational analytics
- Server-side Excel export flow backed by `exceljs`
- Automated coverage with Playwright, Vitest, and CI checks

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS v4
- TanStack React Query
- Playwright
- Vitest

## Current Scope

Implemented in the current release candidate through Fase 2:

- auth and role-based routing
- products, categories, users, routes, and points of sale
- display cases and central inventory
- route-of-the-day and visit execution
- counting, payment capture, replenishment, guarantees, incidences, photos, and transactional visit closing
- supplier and purchase management with reception flow
- dashboard with monthly collections, low-stock visibility, and open-incidence feed
- exportable reports for sales, ranking, inventory, visits, and incidences/guarantees

Release hardening included:

- coherent role home routing, including `compras`
- at least one final display-case photo required to complete a visit
- local Supabase reset + auth seeding + type generation workflow
- CI pipeline and release checklist for commercial readiness

## Local Setup

```bash
git clone https://github.com/scldrn/ruteria.git
cd ruteria
cd ruteria

npm install
npm run db:start
./scripts/export-supabase-env.sh dotenv > .env.local
npm run db:reset
npm run seed:auth
npm run dev
```

Main app: `http://localhost:3000`

Repository root: `ruteria/`

App workspace: `ruteria/ruteria/`

## Quality Checks

```bash
npm run ci:checks
npm run audit:prod
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
```

Release gate details live in `RELEASE_CANDIDATE_CHECKLIST.md`.

## Repository

- `ruteria/`: main application workspace
- `docs/`: sprint and implementation docs
- `SPRINTS.md`: delivery history
- `ERP_CRM_Plan_v2.md`: master product plan aligned to the shipped scope
- `RELEASE_CANDIDATE_CHECKLIST.md`: commercial release gate
- `DEPLOYMENT_RUNBOOK.md`: staging/production promotion and rollback guide
- `CLAUDE.md`: repo conventions

## License

MIT
