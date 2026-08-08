# CLAUDE.md — dreamingsheep

Context file for AI agents (Claude Code & friends). Granular docs live next to the
code: [db/CLAUDE.md](db/CLAUDE.md) (schema, migrations, seeds, production DB runbook)
and [src/CLAUDE.md](src/CLAUDE.md) (RPC/session core, forms, charts, page conventions).

## What this is

An **online dream journal** (dreamingsheep.net) — log dreams, tag them with
symbols, analyze patterns via stats/charts. Solo-maintained by @talpitoo
("the lone wolf in the dreamingsheep skin"), frontend-focused.

Product philosophy (distilled from the blog under `src/pages/blog/`):

- A **"neu(t)ral tool"**: statistical pattern discovery, _not_ dream-dictionary
  symbolism ("less 'fallen out tooth means X' and more statistical analysis").
  Interpretation is left to the user's intuition.
- **No social features, ever**: no public dreams, no forum, no likes. Dreams are
  private to their owner — queries are always scoped to `ctx.session.userId`.
- **Privacy-first**: only email + dream entries are collected; export/delete
  everything from Settings.
- **Free forever**: no subscription tiers; optional Patreon only.
- **Source-available, not open source**: see [LICENSE.txt](LICENSE.txt) — only
  dreamingsheep.net may be deployed publicly. Contributions come back via PR.
- Tone of all user-facing copy: playful, literary, lowercase "i", footnotes,
  pop-culture quotes, sign-offs like "Long time no sleep" / "Meh!".

## ⚠️ Frozen dependencies policy (long-term goal — respect this)

**All dependencies stay exactly as pinned in `package.json`, frozen in time —
including Node 22 — unless the maintainer personally tests and approves a new
dependency that is truly required.** This is a peculiar, carefully balanced combo:

- **Next 16.2** (pages router — App Router is a future roadmap item) on **Node 22**;
  Blitz was removed 2026-08 in one take (design:
  [docs/superpowers/specs/2026-08-02-blitz-removal-design.md](docs/superpowers/specs/2026-08-02-blitz-removal-design.md))
  and replaced by a small **owned core**: `src/core/` (resolver, paginate, errors,
  rpc handler/client, Routes) + `src/auth/session/` (DB-backed sessions, CSRF) —
  ~900 lines, unit-tested; treat it as security-critical code
- **MUI 5 + Tailwind 3** mixed together (yes, both; `sx` and utility classes coexist)
- **Prisma 3.13** + Postgres, React 18, react-google-charts 4 + d3 7,
  @tanstack/react-query 4 (what the rpc-client wraps), superjson on the RPC wire
- Three date libs coexist: moment (stats), luxon (pickers), date-fns — don't
  consolidate them, don't add a fourth

Do **not** bump versions, add libraries, or "modernize" as a side effect of a
feature. Prefer reusing existing components/queries over introducing anything new
(backend additions especially — the maintainer is frontend-focused). The future
migration to the Next.js App Router remains on the roadmap and is **out of scope**
until explicitly started.

## Stack & layout

- Next.js app: pages in `src/pages/` (file-based routing), domain logic in
  `src/<entity>/{queries,mutations,components,validations.ts}` — entities:
  `dreams`, `symbols`, `users`, `sleepingTimes`, plus `auth`, `stats`, `settings`,
  `contact`, `core` (shared components/layouts/helpers).
- DB: `db/schema.prisma`, migrations in `db/migrations/`, seeds via `npm run db:seed`.
- Blog articles and FAQ are **hardcoded TSX pages** (no CMS/markdown), e.g.
  `src/pages/blog/<slug>/index.tsx`.
- Icon font: "lucidicon" CSS classes (`lucidicon-eye`, `lucidicon-unicorn`, …);
  most icons originally from thenounproject.com.
- Prettier: no semicolons, printWidth 100. Husky + lint-staged on commit.

## Commands

```sh
npm run dev          # next dev → localhost:3000
npm run build        # next build
npm run lint         # eslint
npm run type:check   # tsc --noEmit
npm run studio       # prisma studio (loads .env.local via node --env-file)
npm run migrate:dev  # create/apply migrations locally
npm run migrate:deploy       # apply committed migrations (production runbook)
npm run db:seed              # seed symbols, demo users, demo dreams

# everything in Docker (see README.md) — add -f docker-compose.dev.yml for hot reload
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml -f docker-compose.local.yml up -d
```

The compose stack has two flavours: without `docker-compose.dev.yml` the app
container serves a **baked production build** (edits need a rebuild); with it, the
repo is bind-mounted and `npm run dev` hot-reloads. The `Dockerfile` has matching
`dev` / `production` targets.

Local seeded demo logins (localhost only): `zhuangzi@dreamingsheep.net` /
`zhuangzi` (rich demo data), also `meh` and `dalecooper` users — see
`db/utils/seedDefaultUsers.ts`.

## Deploying

Production = a single AWS EC2 box (Ubuntu/ARM): nginx reverse-proxies
:443 → localhost:3000 (with a `maintenance.html` served on 502/503/504),
Postgres runs **locally on the same box**, app config in `.env.local`
(never committed), Next.js app kept alive via `nohup` + shell aliases
(`dream`, `dreamkill`, `dream-restart`, `dreamlog`, `dreamcheck`).

Release flow: bump `"version"` in `package.json` → commit `new version vX.Y.Z`
→ tag `vX.Y.Z` → push tag. GitHub Actions
[.github/workflows/deploy.yml](.github/workflows/deploy.yml) then SSHes into the
box, `git pull`, `yarn install`, `yarn build`, restarts. **It does NOT run DB
migrations** — those are applied manually with `npm run migrate:deploy`
(never `migrate dev` in production; the npm script loads `.env.local` via
Node's `--env-file` — bare `npx prisma` still reads only `.env`). Full DB
runbook in [db/CLAUDE.md](db/CLAUDE.md). The maintainer
keeps a private devops cheatsheet (AWS/EC2/S3 setup, nginx config, Gmail OAuth,
DNS, backups) outside this repo — ask rather than guess for infra details.

## Roadmap (see ROADMAP.md)

Phase 1: Tailwind-v4 migration of `sx={{}}` (maintainer-led), tests, TS strict (#3, now unblocked).
Phase 2: Blitz removal **done** (2026-08); the Next.js App Router move remains (**not now**).
Phase 3: interactive charts (in progress — issues #6/#7), AI dream interpreter,
public export API.
