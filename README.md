<div align="center">

# powERP

**A field operations ERP/CRM for consignment retail networks**

Built to manage the full visit workflow across **200+ retail locations**: routes, inventory counts, collections, replenishment, and admin oversight.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=black)](https://supabase.com/)
[![Playwright](https://img.shields.io/badge/Tested%20with-Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

## Overview

`powERP` is a production-style internal platform for a consignment business operating physical display cases inside third-party stores.

It replaces manual coordination with a structured system for:

- route planning and daily field execution
- inventory counting and inferred sales
- payment registration and discrepancy handling
- replenishment from central stock to field staff to display cases
- admin visibility into visits, stock, and operations

This is one of my strongest portfolio projects because it combines product thinking, operational domain modeling, backend integrity, and end-to-end ownership.

## Highlights

- Mobile-first workflow for field collaborators
- Role-based admin and field experiences
- SQL triggers and RPCs for transactional inventory logic
- Automated coverage with Playwright and Vitest

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

Implemented so far:

- auth and role-based routing
- products, categories, users, routes, and points of sale
- display cases and central inventory
- route-of-the-day and visit execution
- counting, payment capture, replenishment, photos, and transactional visit closing

Next up:

- incident workflows
- inventory history and reporting
- analytics and deeper operational tooling

## Local Setup

```bash
git clone https://github.com/scldrn/powERP.git
cd powERP/erp-vitrinas

npm install
cp .env.example .env.local

supabase start
supabase db reset
npm run seed:auth
npm run dev
```

Main app: `http://localhost:3000`

## Quality Checks

```bash
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
```

## Repository

- `erp-vitrinas/`: main application
- `docs/`: sprint and implementation docs
- `SPRINTS.md`: delivery history
- `CLAUDE.md`: repo conventions

## License

MIT
