# Contributing to ruteria

This repository follows a lightweight operating standard: keep the flow simple,
validate locally, and avoid automation that adds more friction than value. See
[`docs/ESTANDAR_REPO_LIGERO.md`](docs/ESTANDAR_REPO_LIGERO.md) for the policy.

---

## Prerequisites

- Node.js 20+
- Docker Desktop (running)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started/install-the-cli) — macOS: `brew install supabase/tap/supabase` · Linux/Windows: see link

---

## Local Setup

```bash
git clone https://github.com/scldrn/ruteria.git
cd ruteria/ruteria

npm install
supabase start                    # starts local Postgres + Auth + Storage
cp .env.example .env.local        # fill in values shown by `supabase status`
npm run db:reset                  # runs migrations
npm run seed:auth                 # creates test users via API
npm run dev
```

App runs at `http://localhost:3000`

**Test credentials:**

| Email | Password | Role |
|-------|----------|------|
| `admin@erp.local` | `Admin1234!` | admin |
| `colaboradora@erp.local` | `Colab1234!` | colaboradora |

---

## Working Model

- Use `develop` as the default integration branch for ongoing work.
- Keep `main` production-oriented.
- Create a short-lived branch when it adds clarity; direct pushes are acceptable
  when the context is coordinated and the change is small.
- Use Pull Requests when they help review or traceability. They are encouraged,
  not mandatory for every change.
- Reserve `release/*` and `hotfix/*` for cases that really need extra ceremony.

---

## Validation

Default application changes:

- `npm run lint`
- `npm test`
- `npm run build`

Sensitive changes should also include:

- `npm run type-check`
- `npm run test:e2e` when auth, permissions, exports, offline sync, or routing are involved
- `npm run audit:prod` when updating runtime dependencies

---

## Commit Messages

```
feat: descripción en español
fix: descripción en español
chore: descripción en español
docs: descripción en español
test: descripción en español
```

- Prefix in English, description in Spanish (per project convention)
- No period at the end
- Use imperative mood: `agregar` not `agregado`

---

## Before Adding Automation

Do not add bots, blocking checks, new workflows, or branch policies unless the
benefit is clear and specific.

Any new automation should explain:

- which real problem it solves
- what risk or time it saves
- why the added friction is worth it
