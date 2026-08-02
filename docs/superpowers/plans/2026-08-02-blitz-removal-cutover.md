# v4.0.0 cutover runbook — Blitz removal goes to production

The `blitz-removal` branch is done and verified (spec: `../specs/2026-08-02-blitz-removal-design.md`,
plan: `2026-08-02-blitz-removal.md`). This runbook is the **maintainer-driven** final mile:
nothing here runs automatically, every step is yours to trigger.

**What ships:** Next 16.2.12 (Pages Router) + Node 22, Blitz fully removed, owned RPC/session
core, zero DB schema changes, zero password resets. **Expected user impact: everyone is logged
out once** (new session token format) — nothing else.

## 1. Pre-flight (days before, zero risk to the live app)

On the EC2 box:

```sh
# Node 22 alongside 18 (18 stays installed for rollback)
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22 && npm install -g yarn     # yarn is per-node-version

# dry-run build in a scratch dir — proves ARM prebuilds (sharp, sodium-native)
# and the Next build on the box without touching the live checkout
git clone git@github.com:talpitoo/dreamingsheep.git ~/migration-dryrun
cd ~/migration-dryrun && git checkout blitz-removal
cp ~/dreamingsheep/.env.local .   # build inlines NEXT_PUBLIC_* values
nvm use 22 && yarn install && npx prisma generate && yarn build
rm -rf ~/migration-dryrun         # after it succeeds
```

Also before the day:

- [ ] Check the **private cheatsheet aliases** (`dream`, `dreamkill`, `dream-restart`,
      `dreamlog`, `dreamcheck`) for `blitz` and `nvm use 18` references — update them to
      `next` / `nvm use 22`. (`deploy.yml` now kills `pkill -f next`.)
- [ ] The gitignored **`DEPLOYMENT.md`** on your machines: this branch updated the local copy
      (migrate command + env-loading note) — sync wherever else it lives.
- [ ] Optional: announce a maintenance moment; the nginx `maintenance.html` covers the restart
      window automatically on 502/503/504.

## 2. Ship it

```sh
# merge (or fast-forward) blitz-removal → main, then the usual release ritual:
#   package.json "version": "4.0.0"
#   commit: new version v4.0.0
#   tag v4.0.0 + push tag   → deploy.yml takes over (pkill next, nvm 22, yarn build, nohup)
```

**There are no DB migrations in this release** — the manual `npm run migrate:deploy` step is a
no-op and harmless. No `blitz` CLI anywhere: the npm scripts load `.env.local` via Node's
`--env-file`.

## 3. Post-deploy smoke (10 minutes)

- [ ] Log in (your own account — argon2id hash must verify: **no password reset!**)
- [ ] Dreams list + calendar render; create + delete a test dream
- [ ] PDF export downloads and opens (puppeteer on Node 22 — verified locally, confirm on ARM)
- [ ] Symbol image upload against real S3 (quota display, delete)
- [ ] **Sign up with a throwaway address** → welcome email + OTP arrives (Gmail OAuth2 — the one
      flow that could not be tested locally, creds live only on the box), verify, delete account
- [ ] Forgot password → email arrives → reset → old session on another device is dead
- [ ] Log out; public home/blog/FAQ render logged-out
- [ ] `tail -f ~/dreamingsheep/nohup.out` — no RPC/session errors while you click around

## 4. Rollback (if anything smells wrong)

```sh
pkill -f next
cd ~/dreamingsheep
git checkout v3.7.1
source ~/.nvm/nvm.sh && nvm use 18
yarn install && rm -rf .next && yarn build
cp public/assets/title-dreamingsheep.png public/assets/sheep-dreamingsheep.png .next/static/media/
nohup bash -c 'cd ~/dreamingsheep && source ~/.nvm/nvm.sh && nvm use 18 && yarn start' > ~/dreamingsheep/nohup.out 2>&1 &
disown -a
```

No schema to unwind — v3.7.1 runs against the same database. Users get logged out once more
(the new-format cookies are meaningless to Blitz); that's the whole cost.

## 5. Later (optional housekeeping)

- [ ] Sweep stale Blitz-era session rows once things are calm:
      `DELETE FROM "Session" WHERE "expiresAt" < now();`
- [ ] Delete `JWT_SECRET` from the box's `.env.local` (nothing reads it — verified 2026-08-02)
- [ ] `docker rmi` old Blitz-era images on any machine that keeps the compose stack
      (`dreamingsheep-blitzjs-app` image name is historical and kept — only the contents changed)
- [ ] Close/annotate GitHub issues: #5 (resolved via custom session layer), #4 (retitle to the
      remaining App Router half), #23 (env-loading half solved), #3 (unblocked — welcome
      contributors back)
- [ ] Uninstall the global `blitz` CLI wherever it lingers: `npm uninstall -g blitz` (per Node
      version)

## Local dev environment notes (your machine, as left by the migration session)

- `.env.local` `DATABASE_URL` now points at the **Docker compose postgres**
  (`postgres:postgres@localhost:5432/dreamingsheep`); your original line is kept commented
  directly above it. The host PostgreSQL service is stopped (its password did not match
  `.env.local` — worth realigning someday, or keep using the Docker DB).
- Docker keeps `docker-postgres-dreamingsheep` + the MinIO S3 mock running; the app container
  is stopped (run the app natively with `nvm use 22 && npm run dev`, or bring the container up
  per the README routes).
