# db/ — schema, migrations, seeds

Prisma **3.13** (frozen — see root [CLAUDE.md](../CLAUDE.md) dependency policy) on
Postgres. Schema path is set in `package.json` (`"prisma": { "schema": "db/schema.prisma" }`).

## Models (schema.prisma)

- **User** — auth + settings flags live directly on the model
  (`trackSleepingTime Boolean @default(false)` is the pattern for opt-in
  feature flags). Relations: `dreams`, `ownSymbols` (authored) vs
  `relatedSymbols` (m2m: which predefined symbols the user has enabled),
  `sleepingTimes`, `tokens`, `sessions`, `otp`. Roles: `USER | ADMIN | DEMO`.
- **Dream** — `dreamAt` (the date that matters for stats), `title`,
  `description`, `mood Int` (1–5), enums `type` (REGULAR/LUCID/…),
  `time` (NIGHT/MORNING/…), `recall` (BLURRY/N_A/CLEAR), `favorite`,
  m2m `symbols`. Cascade-deletes with the user.
- **Symbol** — `builtIn` distinguishes predefined/system symbols from
  user-created ones (`authorId`). `code` is unique.
- **SleepingTime** — bedtime/wake-up per day (opt-in via `trackSleepingTime`); rows
  are night-anchored: day N's bedtime belongs to the night N→N+1 even when the
  clock value is after midnight (see docs/superpowers/specs/2026-08-09-sleep-night-anchoring-design.md).
- Session/Token/Otp — auth plumbing (owned session layer, `src/auth/session/`; the Session table kept its Blitz-era shape on purpose).

## Migration workflow

Local (dev):

```sh
# 1. edit db/schema.prisma
npm run migrate:dev -- --name <snake_case_name>   # generates db/migrations/<ts>_<name>/migration.sql
npm run db:seed                                        # if reseeding is needed
```

Commit the generated migration folder. Keep migrations **additive** where
possible (new columns with defaults) so deploys are zero-downtime and old code
keeps working during rollout.

## ⚠️ Production runbook (deploy.yml does NOT run migrations)

Production context (details in the maintainer's private devops cheatsheet):
Postgres runs **locally on the EC2 box** (db name `dreamingsheep`, user
`postgres`, local trust auth), app config lives in **`.env.local`**, and a weekly
`~/backup.sh` cron (Mondays) already dumps the DB into `~/backup/` with 7-day
rotation.

On the EC2 box, before deploying a release that contains a new migration:

```sh
~/backup.sh                        # 1. extra backup (or: pg_dump -U postgres dreamingsheep > backup/backup-dreamingsheep-manual.sql)
cd ~/dreamingsheep && git pull     # 2. get the committed migration files
npx prisma generate                # 3. refresh the client (also runs during build)
npm run migrate:deploy        # 4. apply pending migrations
# 5. then the usual build/restart (tag push → GitHub Action, or the dream* aliases)
```

- Use **`npm run migrate:deploy`**, not bare `npx prisma migrate deploy` —
  the npm scripts load `.env.local` via Node's `--env-file` (where `DATABASE_URL` lives); plain Prisma
  only reads `.env`.
- `migrate deploy` only applies already-committed migration files and is a no-op
  when nothing is pending — safe to run on every deploy.
- **Never** run `prisma migrate dev` against production.
- Rollback for additive columns: revert the app code; the extra column is
  harmless, no down-migration needed.
- If a schema change needs a one-off data backfill/reseed, the established
  pattern is a dedicated seed file run **once**:
  `npm run db:seed:after-schema` (never the default
  `npm run db:seed` on production — it would recreate demo users/dreams).

## Seeds

`db/seeds.ts` runs (in order): `seedSystemSymbols` → `seedDefaultUsers` →
`seedCustomSymbols` → `seedDefaultDreams` (all in `db/utils/`). Demo users:
`meh`, `zhuangzi` (the Butterfly Dream demo data seen in screenshots/dev login),
`dalecooper`. `seedAfterDbSchemaUpdate.ts` exists for one-off backfills after
schema changes.
