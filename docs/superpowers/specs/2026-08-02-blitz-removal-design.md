# Blitz removal — one-take migration to plain Next.js (design spec)

- **Date**: 2026-08-02
- **Status**: approved design, pending implementation plan
- **Decided with**: @talpitoo (maintainer) — all major decisions below were made interactively
- **Supersedes/relates**: issues [#4](https://github.com/talpitoo/dreamingsheep/issues/4)
  (Blitz → Next.js), [#5](https://github.com/talpitoo/dreamingsheep/issues/5) (auth replacement),
  [#23](https://github.com/talpitoo/dreamingsheep/issues/23) (env files — partial slice),
  [#3](https://github.com/talpitoo/dreamingsheep/issues/3) (TS strict — unblocked by this work)

## 1. Context & motivation

dreamingsheep runs on BlitzJS `2.0.0-beta.31` (a frozen beta of a framework in maintenance mode)
on Next `13.4.5` (Pages Router) and Node 18 (EOL). The maintainer wants Blitz **removed completely
in one take** — one branch, reviewable milestones, a single production cutover — with **every
feature functioning exactly as before**: dream/symbol/sleeping-time CRUD, stats, search, settings,
PDF export, S3 image uploads, signup + OTP email verification, forgot/reset password, account
deletion, blog, admin listing.

This amends issue #4's "many smaller PRs" plan (maintainer decision, 2026-08-02) and #5's choice
of NextAuth (see Decisions). The App Router move remains a separate, future effort — this take
completes the "remove Blitz" half of #4 only.

## 2. Goals & hard constraints

1. **Zero user-visible behavior change**, with two accepted exceptions:
   - everyone is logged out once at cutover (new session token format)
   - nothing else — quirks are ported as-is (see §10)
2. **No password resets** — existing `secure-password` argon2id hashes keep verifying (issue #5
   hard constraint).
3. **Zero DB schema changes** — `Session`, `Token`, `Otp`, `User` tables untouched. This is what
   makes rollback a pure redeploy.
4. **UI dependency freeze holds**: React 18.2, MUI 5, Tailwind 3, emotion, swiper,
   react-google-charts, d3, the three date libs — all stay exactly as pinned.
5. Privacy invariant preserved and machine-checked: every RPC endpoint authorizes and scopes to
   `ctx.session.userId` (CONTRIBUTING rule; guarded by the `isolation` e2e suite + a new registry
   completeness test).
6. Solo-maintainable outcome: net dependency count goes **down**; owned plumbing is ~600–900 lines
   with unit tests.

## 3. Decisions log (maintainer-approved)

| #   | Decision              | Choice                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Dependency thaw scope | **"Stable frame, UI frozen"**              | Bump only the frame (Next, Node, auth plumbing) to supported versions; keep the entire UI layer pinned. Pages Router stays — no page rewrites.                                                                                                                                                                                                                                                                                     |
| D2  | Auth replacement      | **Custom session layer** (not NextAuth)    | Auth.js v5 is _still_ beta (`5.0.0-beta.32` as of 2026-08) — swapping one frozen beta for another defeats the purpose. next-auth v4 credentials provider forces JWT sessions: server-side revocation (resetPassword/deleteUser) would be lost, Session table abandoned, while signup/OTP/reset flows would remain custom code anyway. The custom layer keeps the existing table, semantics, and rollback story with zero new deps. |
| D3  | Target versions       | **Next 16.2 → 15.5 fallback; Node 22 LTS** | Both Next lines accept React 18.2 on Pages Router (verified via npm peer deps). Node 22 (maintenance until 2027-04) satisfies both (`next@16` needs ≥20.9) and its `--env-file` replaces the blitz CLI's `.env.local` loading with zero deps. Milestone 0 spike decides 16 vs 15.5 empirically; any Pages Router friction on 16 → drop to 15.5 without debate.                                                                     |
| D4  | Cutover shape         | One branch, single deploy, `v4.0.0`        | Matches "one single take". Rollback = redeploy previous tag + `nvm use 18` (no schema unwind).                                                                                                                                                                                                                                                                                                                                     |

## 4. Inventory (measured 2026-08-02)

| Metric                                        | Count                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RPC endpoints (queries + mutations)           | **32** (14 + 18)                                                                                                                    |
| Pages (excl. `api/`)                          | 29 files — 8 data-driven, 2 with gSSP (home, blog index; categories overlap), the rest static content + `_app`/`_document`/`_error` |
| API routes                                    | 8 — 4 Blitz `api()`-wrapped, 3 plain + `getSession`, 1 RPC catch-all                                                                |
| Files importing anything Blitz                | **93**                                                                                                                              |
| `Routes.*` call sites                         | 81 across 33 files (two import paths: `@blitzjs/next` and `.blitz`)                                                                 |
| `<Suspense>` boundaries over Blitz `useQuery` | ~50 across 26 files                                                                                                                 |
| Unit tests / e2e specs                        | 10 files / 6 specs — **all already Blitz-free**                                                                                     |
| Mailers                                       | 0 — all email in `src/pages/api/email/send.ts` (Gmail API, 3 inline templates)                                                      |

Notable facts the migration must respect:

- **Wire format is superjson** — dream date filters (`dreamtAt` ranges) cross as real `Date`s.
- **Signup/OTP verification runs on an anonymous (pre-login) session** carrying
  `verifyUserToken` in publicData; `verifyUser`/`resendOtp` authenticate off it.
- `resetPassword` revokes **all** DB sessions for the user; `deleteUser` does `$revoke()`.
- The 3 S3 routes deliberately bypass CSRF via a method-spoofing hack (session auth still
  enforced); `useUpload` sends a wrong-named CSRF header that is consequently ignored;
  `ExportDreams` sends the correct `anti-csrf` header to `html-to-image`.
- `getCurrentUser` and `logout` are bare resolvers (no `resolver.pipe`); `verifyUser.ts` and
  `resetPassword.ts` call other resolvers directly as functions (survives migration as-is).
- `src/pages/index.tsx` already uses a server-side gSSP redirect instead of
  `redirectAuthenticatedTo` (issue #10 precedent); `suppressFirstRenderFlicker` is used there.
- Deploy (`.github/workflows/deploy.yml`) SSHes to the EC2 box: `pkill -f blitz` → `git pull` →
  `nvm use 18` → `yarn install` → `yarn build` → copies 2 email PNGs into `.next/static/media/` →
  `nohup yarn start`. **No DB migration step** (manual by design).
- Dead already (removable): `@aws-sdk/s3-request-presigner`, `preview-email`,
  `@types/preview-email`, empty `mailers/` + `integrations/` dirs, `.migration.json`, unused `gSP`.

## 5. Architecture — replacement plumbing

Blitz plays five roles; each gets a standard-Next or small-owned replacement. All owned code lives
in `src/core/` (RPC, errors, resolver, hooks), `src/auth/session/` (session layer), and
`src/routes.ts`.

### 5.1 RPC server

- `src/core/resolver.ts`: reimplements `resolver.pipe`, `resolver.zod`, `resolver.authorize`
  (+ `paginate`) with identical semantics — `authorize()` throws `AuthenticationError` (401) when
  unauthenticated, `AuthorizationError` (403) on role mismatch (role model: `ADMIN`/`USER`
  string comparison, as `simpleRolesIsAuthorized` does today). ~70 lines.
- `src/core/errors.ts`: `AuthenticationError`, `AuthorizationError`, `NotFoundError` with the same
  `name` values and status codes, so `_app`'s `RootErrorFallback` branching keeps working.
- `src/pages/api/rpc/[endpoint].ts`: catch-all preserving Blitz's URL shape
  (`POST /api/rpc/getDreams`) and superjson `{params, meta}` wire format. Dispatches via an
  **explicit static registry** of all 32 resolvers (no filesystem magic). Builds `ctx.session`
  from the session layer, validates CSRF, superjson-serializes results; errors serialize as
  `{name, message, statusCode}` (no stacks in production) and rehydrate into the same classes
  client-side.
- Registry completeness is unit-tested: every file under `src/**/{queries,mutations}/` must be
  registered — the CONTRIBUTING "every resolver is a public endpoint" rule, machine-checked.

### 5.2 RPC client

- Blitz-shaped hooks on the already-installed `@tanstack/react-query@4`: `useQuery`,
  `usePaginatedQuery` (with `keepPreviousData`), `useMutation`, `invalidateQuery` — same tuple
  returns (`[data, extras]`, `[mutateFn, extras]`), **suspense enabled by default** so all ~50
  `<Suspense>` boundaries and the ErrorBoundary reset flow behave as today.
- Client code can no longer import server resolver files (that was Blitz compiler magic). Each
  entity gets a stub module (`src/dreams/client.ts` etc., one line per endpoint, ~32 lines total)
  typed via `import type` from the real resolver — call sites change **imports only**, not bodies.
- The RPC fetcher attaches the `anti-csrf` header automatically and carries superjson both ways.
- `_app.tsx` hoists the QueryClient to module level (currently constructed inside render — must be
  touched during rewiring anyway; suspense + error-reset defaults configured there).

### 5.3 Session layer (custom, ~300 lines — the security-critical core)

- **Storage**: the existing `Session` table, columns used as Blitz uses them — `handle` (unique),
  `hashedSessionToken` = sha256 of an opaque random token, `antiCSRFToken`, `publicData` (JSON
  string), `expiresAt` (sliding ~30-day window, refreshed on activity).
- **Cookies**: same `dreamingsheep_s*` naming — httpOnly session token; JS-readable anti-CSRF and
  publicData values (so a local `getAntiCSRFToken()` and `useSession()` keep working). `secure` in
  production, `SameSite=Lax`. Token format is ours ⇒ one forced re-login at cutover.
- **Two session kinds, like Blitz**: _authenticated_ = DB row, revocable server-side;
  _anonymous_ = HMAC-signed cookie (key: `SESSION_SECRET_KEY`) carrying publicData + anti-CSRF —
  required by the signup → OTP → `verifyUser` flow (publicData holds
  `{userId, username, role, verified, verifyUserToken?}` per `types.ts`).
- **Context surface** (only what the code actually uses): `$create(publicData)`, `$revoke()`,
  `$setPublicData(partial)`, `$authorize(role?)` plus publicData field reads. The 8 auth mutations
  keep their bodies; `db.session.deleteMany({userId})` in `resetPassword` keeps its exact meaning.
- **`getSession(req, res, { skipCsrf? })`** for API routes; the 3 S3 routes use `skipCsrf: true`
  (replacing the method-spoof hack — same behavior, honest code); `html-to-image` keeps CSRF
  enforced (`ExportDreams` already sends the right header; `useUpload` stays untouched — its
  header is ignored today and remains ignored).
- **`SecurePassword`**: local ~40-line wrapper over the already-installed `secure-password@4`
  (same hash/verify/`VALID_NEEDS_REHASH` contract) — hash-compatible, no resets. `generateToken`
  / `hash256`: ~10 local lines (crypto stdlib).
- **Client**: `useSession()` reads the publicData cookie (empty on server/first paint to avoid
  hydration mismatch — matching Blitz's anonymous-first behavior), with a tiny store so
  Header/Footer re-render after login/logout. Page flags `authenticate = true` /
  `redirectAuthenticatedTo` are honored by ~40 lines in the rewritten `_app`
  (`suppressFirstRenderFlicker` respected).

### 5.4 Mechanical codemod (compile-driven, no logic edits)

- `BlitzPage` (26 files) → local `AppPage` type (same statics).
- `Routes` (33 files, both import paths) → hand-written `src/routes.ts`: 18 helpers returning
  `{pathname}` objects; `router.push(Routes.X())` and `.pathname` reads work unchanged.
- `Ctx`/`PublicData` → local types (drop the `@blitzjs/auth` module augmentation);
  Blitz error imports (8 files) → `src/core/errors`; `invalidateQuery` (2 call sites) → shim.
- `next.config.js` drops `withBlitz`; `db/index.ts` swaps `enhancePrisma` for the standard
  dev-safe PrismaClient global singleton (re-check the vitest `db` alias afterwards);
  `_app.tsx` drops `withBlitz`, uses `react-error-boundary` (new direct dep; it's what Blitz
  re-exports today) + `useQueryErrorResetBoundary` from tanstack directly.
- The 2 gSSP pages become plain `getServerSideProps` (home's session-gated redirect uses server
  `getSession`); `_document.tsx` / `_error.tsx` need zero changes.

### 5.5 API routes

The 4 `api()`-wrapped routes become plain `NextApiHandler`s (`email/send` never used `ctx`;
`html-to-image` and `s3/size` keep session gates). Blitz's `[[...blitz]].ts` catch-all is deleted,
replaced by §5.1's handler.

### 5.6 Seeds, env, CLI — the forced #23 slice

- Scripts: `dev`/`build`/`start` → `next dev`/`next build`/`next start`.
- Prisma + seeds get wrapped npm scripts using **Node 22's `--env-file=.env.local`** (zero new
  runtime deps): `migrate:dev`, `migrate:deploy`, `db:seed`, `db:seed:after-schema` (replaces
  `blitz db seed --file=…`), `studio`. SSH runbook becomes `npm run migrate:deploy`.
- Seeds run via `tsx` (new devDep); `db/utils/seedDefaultUsers.ts` imports the local
  `SecurePassword` wrapper.
- Full #23 (`.env.production.local` + `APP_ENV` rename) stays **parked** — this mechanism makes it
  trivial later; production keeps `.env.local` for now (zero runbook churn at cutover).
- Docs sweep: ~20 `blitz …` command references across README (all 3 routes), DEPLOYMENT.md,
  CLAUDE.md, db/CLAUDE.md, CONTRIBUTING.md; ROADMAP updates (#4 half-done, #5 resolved via custom
  layer, #3 unblocked).
- `JWT_SECRET` in `.env.example` is referenced nowhere in source (verified 2026-08-02) — after
  Blitz removal it is dead; mark it removable in `.env.example` (actual deletion from the
  production `.env.local` is the maintainer's call at cutover).

### 5.7 Deploy & infra

- `deploy.yml`: `nvm use 22`, kill-pattern updated from `blitz` to the next process (same
  nohup/start shape). The email-PNG copy step stays; its destination (`.next/static/media/`) is
  **verified during implementation**, not assumed.
- `Dockerfile`: `node:18` → `node:22` in both targets, drop global `blitz` install, CMDs →
  `next dev` / `next start`. `test.yml` → Node 22. `package.json` `engines` → `"22"`.
- **Pre-cutover dry run on the EC2 box**: clone to a scratch dir, `nvm use 22 && yarn install && yarn build` — proves ARM prebuilds (sharp, sodium-native) and build health without touching the
  live app. Maintainer checks the private cheatsheet's shell aliases (`dream*`) for `blitz`
  references — not guessed at from the repo.

## 6. Testing & acceptance criteria

The migration is **done** when, on Node 22 with zero `blitz`/`@blitzjs/*` packages in
`package.json`:

1. The 10 existing unit-test files pass **unchanged**.
2. New unit tests pass: resolver/paginate semantics, error round-trip, session layer
   (create/verify/revoke/setPublicData/anonymous/CSRF/expiry), RPC registry completeness.
3. All 6 e2e specs green (`dreams`, `symbols`, `search`, `settings-stats`, `public`, and
   especially `isolation` — the cross-user privacy suite), seeded via `npm run db:seed`.
4. Manual checklist green (e2e gaps): real signup → OTP email → verify; resend rate-limit;
   forgot/reset password incl. revoke-all-sessions; change password/email; delete account incl.
   S3 folder purge; **PDF export on Node 22**; S3 upload/quota/delete against MinIO; reCAPTCHA;
   admin `getUsers` (login `meh`); blog listing.
5. `next build` clean; `tsc --noEmit` no worse than before (#3 stays parked); lint clean.
6. Docker routes 2 and 3 (README) still work end-to-end.
7. Docs updated (§5.6 sweep) — no reference to a `blitz` command remains.

## 7. Milestone 0 — compat spike (before any migration work)

Blitz beta.31 cannot run on Next 16, so the spike is a **standalone scratch harness** (not an
in-place bump), throwaway by design:

1. **Node 22 × native/binary deps at pinned versions**: `sharp@0.32.6`,
   `secure-password@4`/sodium-native (hash + verify an existing-format hash), `puppeteer@17`
   incl. an actual `page.pdf()` smoke, `prisma@3.13` generate + a client query.
2. **Next 16.2 + React 18.2 Pages Router mini-app**: the emotion `_document` SSR pattern
   compiles and renders an MUI page; `next/router` object-form pushes work; images config still
   accepts the current setup (or the required rename is noted).
3. Outcome recorded in the implementation plan: **Next 16.2** or **fallback 15.5** — friction on
   16 means 15.5, no debate.

## 8. Risk register

| Risk                                                            | Mitigation                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Session layer bug = security bug                                | Smallest possible surface (~300 lines), unit tests per behavior, `isolation` e2e suite, focused review of this milestone |
| Suspense behavior differences (react-query v4 vs Blitz wrapper) | Suspense-by-default shim; e2e + manual sweep of loading states on dreams/stats/search/settings                           |
| Date serialization regressions                                  | superjson (same format Blitz uses); unit test the round-trip; stats/search e2e cover date filters                        |
| Next 16 Pages Router unknowns                                   | Spike first; 15.5 fallback pre-agreed                                                                                    |
| Native deps on Node 22/ARM                                      | Spike (x86 local) + pre-cutover dry-run build on the ARM box                                                             |
| Deploy-script regression (kill pattern, env loading)            | Dry run on the box; rollback = previous tag + `nvm use 18`; nginx maintenance page covers restarts                       |
| `WEB_APP_URL` self-fetch for emails breaks                      | Unchanged mechanism; manual signup/reset checklist before cutover                                                        |

## 9. Cutover & rollback

- Version → **v4.0.0**; tag push deploys via Actions as usual. **No DB migrations to run.**
- Users: logged out once; old `Session` rows go stale (optional cleanup later).
- Rollback: redeploy previous tag + `nvm use 18` on the box — no schema unwind, old build runs
  against the same DB. (After a rollback, new-format cookies are invalid under Blitz — users
  re-login again; harmless.)

## 10. Explicitly out of scope

- App Router migration (the remaining half of #4) and any RSC/Server Actions work.
- OAuth providers (#5 "nice to have").
- TypeScript strict completion (#3) — unblocked after this lands, not included.
- Full #23 env-file rename (`.env.production.local` + `APP_ENV`).
- Any UI dependency bumps (MUI, Tailwind, React, charts, date libs) or date-lib consolidation.
- Behavior fixes beyond what the migration forces — ported as-is and documented: the
  changed-email-without-reverification quirk, `useUpload`'s ignored CSRF header name,
  `getSymbolsWithoutDreams` returning built-ins only, email templates' absolute image URLs.
