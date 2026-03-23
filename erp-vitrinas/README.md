# erp-vitrinas

Main application workspace for [powERP](../README.md).

## What is here

- Next.js 16 App Router app
- admin and field workflows
- Supabase migrations and Edge Functions
- Playwright and Vitest tests

## Main folders

- `app/`: routes
- `components/`: feature and UI components
- `lib/`: hooks, helpers, validations, Supabase clients
- `supabase/`: migrations and functions
- `tests/`: end-to-end coverage

## Run locally

```bash
npm install
cp .env.example .env.local

supabase start
supabase db reset
npm run seed:auth
npm run dev
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run type-check
npm test
npm run test:e2e
```
