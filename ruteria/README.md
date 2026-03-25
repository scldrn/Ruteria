# ruteria app

Main application workspace for [ruteria](../README.md).

## What is here

- Next.js 16 App Router app
- admin and field workflows
- Supabase migrations and Edge Functions
- dashboard, reports, guarantees, suppliers, and purchases
- Playwright and Vitest tests

## Main folders

- `app/`: routes
- `components/`: feature and UI components
- `lib/`: hooks, helpers, validations, Supabase clients
- `supabase/`: migrations and functions
- `tests/`: end-to-end coverage

## Run locally

```bash
cd ruteria

npm install
npm run db:start
./scripts/export-supabase-env.sh dotenv > .env.local
npm run db:reset
npm run seed:auth
npm run dev
```

## Commands

```bash
npm run dev
npm run dev:host
npm run build
npm run lint
npm run type-check
npm test
npm run test:e2e
npm run ci:checks
npm run audit:prod
```
