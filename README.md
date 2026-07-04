![dreamingsheep](https://dreamingsheep.net/assets/cover1200x630.jpg "dreamingsheep")

# 🐏 _dreamingsheep_

Two ways to run it locally — pick one route and read only that section:

- 💻 **natively** — Node.js + PostgreSQL on your machine; the everyday development setup (hot reload via `blitz dev`)
- 🐋 **everything in Docker** — the only prerequisite is Docker; app, database and S3 mock all run in containers

Either way, the 🪣 **local dev services** section covers running just the S3 mock
(and/or PostgreSQL) in Docker — handy companions for the native route.

## 💻 Getting Started natively (Node.js + PostgreSQL on your machine)

1. Install Node.js (e.g. https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04).
2. Install PostgreSQL (e.g. https://www.digitalocean.com/community/tutorials/how-to-install-postgresql-on-ubuntu-20-04-quickstart).
3. Run PostgreSQL with the default `postgres` user: `sudo -u postgres psql`.
4. Create a password for the default `postgres` user: `ALTER USER postgres WITH PASSWORD '<YOUR_DB_PASSWORD>';`
5. Copy `.env.example` to `.env.local` and fill in your values. See [.env.example](.env.example) for all required variables (database URL, session/JWT secrets, AWS S3, Gmail OAuth2, reCAPTCHA, etc.).
6. `nvm use 18`
7. Install Blitz.js: `npm install -g blitz` (https://blitzjs.com/docs/get-started).
8. Install Yarn: `npm install -g yarn`
9. Install the dependencies: `yarn install`.
10. (optional) in PostgreSQL `DROP DATABASE dreamingsheep;` and `\l` to make sure it is dropped.
11. `npx prisma generate`
12. `blitz prisma migrate dev`
13. `blitz db seed`

Run your app in the development mode.

14. `blitz dev`
15. Open [localhost:3000](http://localhost:3000) with your browser to see the result — log in with the seeded demo user `zhuangzi@dreamingsheep.net` / `zhuangzi`.
16. (optional) Symbol image uploads need an S3 bucket — either real AWS credentials in `.env.local`, or the 🪣 local S3 mock below (no AWS account needed).
17. (optional) If you want to test emails 1) sign up with a real email (you should receive a welcome email with a confirmation code), then sign out and initiate the forgot password flow (you should receive a forgot password email with a token). Requires the Gmail OAuth2 values in `.env.local`.
18. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). For the project roadmap, see [ROADMAP.md](ROADMAP.md).

## 🐋 Getting Started with Docker (the only prerequisite is Docker)

Everything — app, PostgreSQL and the S3 mock — runs in containers via
[docker-compose.production.yml](docker-compose.production.yml) +
[docker-compose.local.yml](docker-compose.local.yml). No Node.js, PostgreSQL or
AWS account needed on your machine. The compose setup mirrors a production-style
deployment, but note that **production does not actually run Docker** (it's a plain
EC2 box) — the compose file is kept as a future deployment option and as the
quickest way to try dreamingsheep locally.

The app container uses `network_mode: host`, so it reaches everything under
`localhost` — your `.env.local` values work unchanged in and out of Docker.

1. Install Docker (with the Compose v2 plugin — the commands below use `docker compose`, not the old `docker-compose`).
2. (optional) Run `sudo usermod -aG docker <username>` (then log out, log in) or run all docker commands with `sudo`.
3. Create your env file — for the all-Docker route this minimal recipe is enough:

```sh
cp .env.example .env.local
```

&nbsp;&nbsp;&nbsp;&nbsp;then edit `.env.local` and set only:

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dreamingsheep
SESSION_SECRET_KEY=<paste the output of: openssl rand -hex 16>
JWT_SECRET=<paste the output of: openssl rand -hex 64>
# ...and uncomment the six KEY=value lines of the "Local S3 mock" block, so symbol
# image uploads work out of the box (keep the ## description lines commented —
# docker compose parses this file strictly)
```

&nbsp;&nbsp;&nbsp;&nbsp;Everything else (AWS, Gmail, reCAPTCHA) can stay empty locally — sign in with the seeded demo user instead of signing up.
&nbsp;&nbsp;&nbsp;&nbsp;⚠️ If you use a different DB password: the compose PostgreSQL initializes from `POSTGRES_PASSWORD` (default `postgres`), and the password is baked into the volume on **first initialization only** — changing it later requires `docker volume rm volume-postgres-dreamingsheep` (wipes the DB!).

4. **Free up port 5432** — the compose PostgreSQL maps it, and with `network_mode: host` the app connects to whatever answers on `localhost:5432`. If a host PostgreSQL keeps running, the dockerized app will silently talk to _it_ instead of the container:

```sh
sudo lsof -i :5432               # who owns the port?
sudo systemctl stop postgresql   # stop the host PostgreSQL for the Docker session
# later: sudo systemctl start postgresql
```

5. Build the app image (first time and after code or `NEXT_PUBLIC_*` changes — takes a few minutes). Two caveats: the build **copies `.env.local` into the image** and `NEXT_PUBLIC_*` values are inlined into the JS bundle at build time — so set the S3 mock block _before_ building, and never push the image to a registry (it contains your secrets):

```sh
docker compose -f docker-compose.production.yml build
```

6. Start the full stack (app + PostgreSQL + S3 mock), then migrate + seed the fresh database (first time only):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.local.yml up -d

docker exec -it docker-dreamingsheep bash
blitz prisma migrate deploy   # applies the committed migrations (non-interactive)
blitz db seed                 # demo users (zhuangzi/zhuangzi) + symbols + dreams
exit
```

7. Open [localhost:3000](http://localhost:3000) and you should see the dreamingsheep landing page. Log in with the seeded demo user `zhuangzi@dreamingsheep.net` / `zhuangzi`.
8. Try the symbol image uploads: Symbols page → **New symbol** → add a picture — upload, preview, quota and delete all run against the S3 mock. Browse the bucket at [localhost:9001](http://localhost:9001) (login `test` / `test1234`).
9. (optional) `docker compose -f docker-compose.production.yml -f docker-compose.local.yml down` stops and removes the containers (the DB + S3 volumes survive; add `-v` to wipe them).
10. (optional) All the docker images will require ~12GB of space (`docker images`):

```
REPOSITORY                  TAG      SIZE
dreamingsheep-blitzjs-app   latest   11GB
postgres                    13.4     533MB
minio/minio                 latest   241MB   (S3 mock)
minio/mc                    latest   117MB   (S3 mock init)
```

11. (optional) Other useful docker commands:

```sh
docker ps
docker compose -f docker-compose.production.yml ps
docker images
docker rmi <id>
docker logs docker-dreamingsheep
docker logs docker-postgres-dreamingsheep
docker exec -it docker-postgres-dreamingsheep psql -U postgres dreamingsheep   # poke the DB directly
docker system prune -a
docker volume ls
docker volume rm volume-postgres-dreamingsheep   # wipe the dockerized DB (re-migrate + re-seed after)
docker compose -f docker-compose.production.yml down --rmi all
```

## 🪣 Local dev services in Docker (S3 mock + PostgreSQL)

Companions for the 💻 native route: run only the services in Docker while the app
runs on your machine with `blitz dev`. (The 🐋 all-Docker route above already
includes them.)

**S3 mock** — symbol image uploads without an AWS account (issue
[#13](https://github.com/talpitoo/dreamingsheep/issues/13)).
[docker-compose.local.yml](docker-compose.local.yml) ships a **MinIO** mock
(LocalStack's free Docker images were discontinued in March 2026) plus a one-shot
init container that creates the `dreamingsheep-local` bucket and opens it for
anonymous downloads (the browser loads symbol images directly from the bucket URL).

1. Start it:

```sh
docker compose -f docker-compose.local.yml up -d
```

2. Point the app at it — uncomment the six `KEY=value` lines of the "Local S3 mock" block in `.env.local` (see [.env.example](.env.example)):

```sh
S3_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test1234
AWS_REGION=us-east-1
S3_BUCKET=dreamingsheep-local
NEXT_PUBLIC_S3_BUCKET=http://localhost:9000/dreamingsheep-local
```

3. Restart the dev server (`blitz dev`) and create a custom symbol with a picture on the Symbols page. Browse the bucket at [localhost:9001](http://localhost:9001) (login `test` / `test1234`).
4. **Production is unaffected**: the S3 client only switches endpoints when `S3_ENDPOINT` is set — leave it unset outside local development.

**PostgreSQL** — if you'd rather not install it natively, run just the database
from the production compose file (mind the port-5432 and password notes in the 🐋
section above):

```sh
docker compose -f docker-compose.production.yml up -d postgres
```

## 🧪 Testing

- `npm test` — unit tests (Vitest): pure helpers (search where-builder, chart/sleep
  aggregations) and zod validation schemas. Fast, no database or server needed.
- `npm run test:watch` — the same in watch mode.
- `npm run test:e2e` — end-to-end tests (Vitest + puppeteer) driving the real app in
  headless Chromium: login, dream/symbol CRUD, search, settings toggles and their
  effect on the Stats page, public pages. Requires a **running dev server**
  (`npm run dev`, or set `E2E_BASE_URL`) and a **seeded local DB** (`blitz db seed`
  — the flows log in as the demo user and clean up after themselves).
- CI (`.github/workflows/test.yml`) runs lint, type-check and unit tests on every
  PR; the E2E suite is local-only for now.
- Philosophy (see issue #2): test the things that actually break — edge cases over
  coverage percentages.
