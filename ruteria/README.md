# ruteria — app workspace

Next.js 16 application for [ruteria](../README.md). This is the main workspace with all application code, migrations, and tests.

## Structure

| Folder | Purpose |
|---|---|
| `app/` | Next.js App Router pages — `(admin)/*` and `(campo)/*` route groups |
| `components/` | Feature and UI components |
| `lib/` | Hooks, helpers, validations, Supabase clients |
| `supabase/` | SQL migrations and Edge Functions (Deno) |
| `tests/` | Playwright end-to-end specs |

## Local setup

```bash
cd ruteria

npm install
supabase start
cp .env.example .env.local   # fill in values from `supabase status`
npm run db:reset
npm run seed:auth             # creates test users via API
npm run dev
```

App runs at `http://localhost:3000`

## Commands

```bash
npm run dev            # start dev server
npm run build          # production build
npm run lint           # ESLint
npm run type-check     # TypeScript (no emit)
npm test               # Vitest unit tests
npm run test:e2e       # Playwright e2e tests
npm run ci:checks      # type-check + lint + test + build + audit
npm run seed:auth      # recreate auth users after db:reset
```
