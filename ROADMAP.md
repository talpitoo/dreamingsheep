# 🐏 _dreamingsheep_ Roadmap

What's coming and where help is wanted. Each item links to its issue —
comment there before starting work (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## ✅ Recently shipped

- [x] Interactive charts: advanced stats dashboard with faceted breakdowns ([#6](https://github.com/talpitoo/dreamingsheep/issues/6)) _(maintainer-led)_
- [x] Chart data range selector, default last 3 months ([#7](https://github.com/talpitoo/dreamingsheep/issues/7))
- [x] Bedtime/wake-up sleep chart (the Settings "future-feature", delivered)
- [x] Testing setup: Vitest unit tests + puppeteer E2E + CI ([#2](https://github.com/talpitoo/dreamingsheep/issues/2)) — **growing the coverage stays open to contributions!**
- [x] Security: homepage stats aggregated in the DB, all queries/mutations scoped to their user ([#11](https://github.com/talpitoo/dreamingsheep/issues/11))
- [x] Symbols page: pagination moved into the database ([#12](https://github.com/talpitoo/dreamingsheep/issues/12))
- [x] Legacy TODO cleanup + quieter login/logout (no more console errors) ([#10](https://github.com/talpitoo/dreamingsheep/issues/10))
- [x] Mobile UX polish: menu auto-collapse & tap-away, edge-to-edge charts, toggleable stats filters ([#14](https://github.com/talpitoo/dreamingsheep/issues/14))
- [x] PWA web app manifest: "Add to home screen" installs with the proper sheep icon
- [x] Local development in Docker (the only prerequisite is Docker) + MinIO S3 mock for symbol image uploads ([#13](https://github.com/talpitoo/dreamingsheep/issues/13))

## Phase 1: Foundation (current)

- [ ] Migrate from MUI `sx={{}}` syntax to Tailwind CSS v4 ([#1](https://github.com/talpitoo/dreamingsheep/issues/1)) _(maintainer-led)_
- [ ] Small in-code `TODO (future-feature)` notes, roughly in priority order:
      absolute `og:image` URLs ([`Layout.tsx`](src/core/layouts/Layout.tsx)),
      base64-ify the PDF-export images ([`ExportDreams/helper.ts`](src/settings/components/ExportDreams/helper.ts)),
      revisit the Settings refetch-vs-reload workaround ([`settings/index.tsx`](src/pages/settings/index.tsx)),
      the `suppressFirstRenderFlicker` experiment ([`pages/index.tsx`](src/pages/index.tsx))

## Phase 2: Framework migration

- [x] **Remove BlitzJS** — one-take migration to plain Next.js 16 (pages router) + Node 22,
      landed 2026-08 (design: [docs/superpowers/specs/2026-08-02-blitz-removal-design.md](docs/superpowers/specs/2026-08-02-blitz-removal-design.md)).
      This completes the "remove Blitz" half of [#4](https://github.com/talpitoo/dreamingsheep/issues/4);
      the App Router move remains open below.
- [x] Replace BlitzJS auth ([#5](https://github.com/talpitoo/dreamingsheep/issues/5)) — resolved with a
      **custom session layer** (`src/auth/session/`, same Session table, no password resets)
      instead of NextAuth: Auth.js v5 was still beta, and the credentials provider forces JWT
      sessions (server-side revocation would be lost). OAuth providers stay a nice-to-have.
- [ ] Migrate to the Next.js **App Router** — the remaining half of [#4](https://github.com/talpitoo/dreamingsheep/issues/4)
- [ ] Env files: move production off `.env.local` to `.env.production.local` + `APP_ENV` ([#23](https://github.com/talpitoo/dreamingsheep/issues/23)) —
      the blocking half is solved (prisma/seeds load `.env.local` via `node --env-file` npm scripts);
      the rename itself is still parked
- [ ] Finish TypeScript strict mode ([#3](https://github.com/talpitoo/dreamingsheep/issues/3)) — **unblocked**
      now that the migration landed: five strict-family flags are already enabled;
      `noImplicitAny` (~58 errors) and `strictFunctionTypes` remain (see the note in [`tsconfig.json`](tsconfig.json))

## Phase 3: Community features

- [ ] AI dream interpreter ([#8](https://github.com/talpitoo/dreamingsheep/issues/8)) _(maintainer-led)_
- [ ] Post-launch promotion ([#17](https://github.com/talpitoo/dreamingsheep/issues/17))
