# Contributing to ruteria

Thank you for contributing! This guide covers everything you need to get started.

---

## Prerequisites

- Node.js 20+
- Docker Desktop (running)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started/install-the-cli) — macOS: `brew install supabase/tap/supabase` · Linux/Windows: see link
- [GitHub CLI](https://cli.github.com/) — macOS: `brew install gh` · Linux/Windows: see link

---

## Local Setup

```bash
git clone https://github.com/scldrn/Ruteria.git
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

## Branch Model

```
main ──────────────────────────────────────── production  (protected)
       ↑ release/sprint-N    ↑ hotfix/*
develop ────────────────────────────────────── integration (protected)
       ↑ feature/SN-foo  ↑ feature/SN-bar
```

| Branch | Branched from | Merges into | Purpose |
|--------|--------------|-------------|---------|
| `feature/S{N}-{description}` | `develop` | `develop` | One task per branch |
| `release/sprint-{N}` | `develop` | `main` + `develop` | Sprint delivery |
| `hotfix/{description}` | `main` | `main` + `develop` | Production emergency |

> **Only `release/*` and `hotfix/*` may open PRs against `main`.** PRs from any other branch type targeting `main` will be automatically closed with a comment explaining the correct flow.

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/S{N}-{description}` | `feature/S3-cobros-discrepancia` |
| Release | `release/sprint-{N}` | `release/sprint-3` |
| Hotfix | `hotfix/{description}` | `hotfix/stock-negativo-trigger` |

Rules:
- All lowercase, hyphen-separated
- Feature branches always include the sprint number prefix (`S{N}`)
- No uppercase, no underscores

---

## Opening a PR

1. **Branch from `develop`** (not `main`):
   ```bash
   git checkout develop && git pull
   git checkout -b feature/S4-my-task
   ```

2. **One task per branch** — keep PRs small and focused.

3. **Make sure CI is green** before requesting review. Required checks for `develop` PRs: `type-check`, `lint`, `test`, `build`, `audit`.

4. **Link the related issue** in the PR description: `Closes #N`

5. **Target `develop`** as the base branch.

---

## Commit Message Format

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

## Code Review

- **1 approval required** from a maintainer before merging
- Stale reviews are **automatically dismissed** when new commits are pushed — you must re-request review after addressing feedback
- Be responsive — stale PRs (no activity for 7 days) may be closed

---

## Releases

Contributors don't cut releases. Maintainers handle `release/sprint-N` branches at the end of each sprint. If you think something should be in an upcoming release, comment on the relevant issue.

---

## Reporting Bugs / Requesting Features

Open an issue on GitHub. Issues are labeled by difficulty:

- `good first issue` — entry level, text or config changes, great for first contributions
- No label — difficulty ranges from junior to senior based on complexity

See existing issues for examples of the format we use.
