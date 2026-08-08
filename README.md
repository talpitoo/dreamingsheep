![dreamingsheep](https://dreamingsheep.net/assets/cover1200x630.jpg "dreamingsheep")

# 🐏 _dreamingsheep_

An online dream journal — log dreams, tag them with symbols, find patterns.
[dreamingsheep.net](https://dreamingsheep.net)

## Pick your route

| #                                                              | route                       | you need installed      | hot reload                    | first run |
| -------------------------------------------------------------- | --------------------------- | ----------------------- | ----------------------------- | --------- |
| [1 💻](#-route-1--natively-nodejs--postgresql-on-your-machine) | **natively**                | Node.js 22 + PostgreSQL | ✅ instant                    | ~5 min    |
| [2 🐋](#-route-2--everything-in-docker-production-like)        | **Docker, production-like** | Docker only             | ❌ rebuild after every change | ~10 min   |
| [3 🔥](#-route-3--everything-in-docker-with-hot-reload)        | **Docker, hot reload**      | Docker only             | ✅ instant                    | ~10 min   |

**Writing code?** Take route 1 if you don't mind installing Node.js and
PostgreSQL, route 3 if you do. Route 2 is for trying the app out, or for
sanity-checking a real production build.

Each of the three sections below is **self-contained** — jump to yours and run it
top to bottom without reading anything else. Steps that are identical across
routes are repeated on purpose and marked ⟳, so you never have to jump around.

Two extra sections at the end: 🪣 [local dev services](#-local-dev-services-in-docker-s3-mock--postgresql)
(run just the S3 mock and/or PostgreSQL in Docker while the app runs natively)
and 🧪 [testing](#-testing).

---

## 💻 Route 1 — natively (Node.js + PostgreSQL on your machine)

The everyday development setup: `npm run dev` on your machine, hot reload out of the box.

### Install the prerequisites

1. Install **Node.js** (e.g. [this guide](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)) — the project is pinned to **Node 22**.
2. Install **PostgreSQL** (e.g. [this guide](https://www.digitalocean.com/community/tutorials/how-to-install-postgresql-on-ubuntu-20-04-quickstart)).
3. Open a PostgreSQL shell as the default `postgres` user and give it a password:

```sh
sudo -u postgres psql
```

```sql
ALTER USER postgres WITH PASSWORD '<YOUR_DB_PASSWORD>';
\q
```

4. Install the two global CLIs:

```sh
nvm use 22
npm install -g yarn
```

### ⟳ Create your env file

5. Copy the example and fill in your values — see [.env.example](.env.example) for every variable (database URL, session/JWT secrets, AWS S3, Gmail OAuth2, reCAPTCHA):

```sh
cp .env.example .env.local
```

&nbsp;&nbsp;&nbsp;&nbsp;The minimum that makes the app run:

```sh
DATABASE_URL=postgresql://postgres:<YOUR_DB_PASSWORD>@localhost:5432/dreamingsheep
SESSION_SECRET_KEY=<paste the output of: openssl rand -hex 16>
JWT_SECRET=<paste the output of: openssl rand -hex 64>
```

&nbsp;&nbsp;&nbsp;&nbsp;AWS, Gmail and reCAPTCHA can stay empty — sign in with the seeded demo user instead of signing up.

### Install, migrate, seed

6. Install the dependencies:

```sh
nvm use 22
yarn install
npx prisma generate
```

7. (optional) Starting from a clean slate? In `sudo -u postgres psql`: `DROP DATABASE dreamingsheep;` then `\l` to confirm it's gone.
8. Create the database schema and fill it with demo data:

```sh
npm run migrate:dev   # creates + applies the migrations
npm run db:seed              # demo users + symbols + dreams
```

### Run it

9. Start the dev server:

```sh
npm run dev
```

10. Open [localhost:3000](http://localhost:3000) and log in with the seeded demo user **`zhuangzi@dreamingsheep.net`** / **`zhuangzi`**.
11. Edit anything under `src/` and save — the page reloads itself. **You're done.**

<details>
<summary>Optional extras (S3 mock for image uploads, testing emails)</summary>

- **Symbol image uploads** need an S3 bucket: either real AWS credentials in `.env.local`, or the 🪣 [local S3 mock](#-local-dev-services-in-docker-s3-mock--postgresql) below (no AWS account needed, one `docker compose` command).
- **Emails**: sign up with a real address (you should get a welcome email with a confirmation code), then sign out and start the forgot-password flow (you should get a token email). Requires the Gmail OAuth2 values in `.env.local`.
- **PostgreSQL without installing it**: `docker compose -f docker-compose.production.yml up -d postgres` runs just the database in a container — see the 🪣 section.
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md) · roadmap: [ROADMAP.md](ROADMAP.md).

</details>

---

## 🐋 Route 2 — everything in Docker, production-like

App, PostgreSQL and the S3 mock all run in containers. The source is **copied into
the image** and `npm run build` runs at build time, exactly like the real deployment
— which also means **every code change needs an image rebuild**. If you're writing
code, take [route 3](#-route-3--everything-in-docker-with-hot-reload) instead.

### ⟳ Install Docker

1. Install **Docker**, with the Compose v2 plugin — the commands below use `docker compose`, not the old `docker-compose`.
2. (optional) So you don't need `sudo` for every docker command:

```sh
sudo usermod -aG docker <username>   # then log out and log back in
```

### ⟳ Create your env file

3. Copy the example — for the all-Docker routes this minimal recipe is enough:

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

&nbsp;&nbsp;&nbsp;&nbsp;Everything else (AWS, Gmail, reCAPTCHA) can stay empty — sign in with the seeded demo user instead of signing up.

### ⟳ Free up port 5432

4. The compose PostgreSQL maps port 5432, and the app container uses `network_mode: host`, so it connects to whatever answers on `localhost:5432`. If a host PostgreSQL keeps running, the dockerized app will silently talk to _it_ instead of the container:

```sh
sudo lsof -i :5432               # who owns the port?
sudo systemctl stop postgresql   # stop the host PostgreSQL for the Docker session
# later, to get it back: sudo systemctl start postgresql
```

### Build and run

5. Build the app image (takes a few minutes):

```sh
docker compose -f docker-compose.production.yml build
```

&nbsp;&nbsp;&nbsp;&nbsp;⚠️ The build **copies `.env.local` into the image** and inlines `NEXT_PUBLIC_*` values into the JS bundle — so finish step 3 _before_ building, and never push this image to a registry (it contains your secrets).

6. Start the full stack (app + PostgreSQL + S3 mock):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.local.yml up -d
```

7. First run only — create the schema and seed demo data inside the container:

```sh
docker exec -it docker-dreamingsheep bash
npm run migrate:deploy   # applies the committed migrations (non-interactive)
npm run db:seed                 # demo users + symbols + dreams
exit
```

8. Open [localhost:3000](http://localhost:3000) and log in with **`zhuangzi@dreamingsheep.net`** / **`zhuangzi`**. **You're done.**
9. Try the symbol image uploads: Symbols page → **New symbol** → add a picture. Upload, preview, quota and delete all run against the S3 mock; browse the bucket at [localhost:9001](http://localhost:9001) (login `test` / `test1234`).

### After a code change

10. Rebuild and restart — there is no hot reload on this route:

```sh
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml -f docker-compose.local.yml up -d
```

11. Stop everything (the DB and S3 volumes survive; add `-v` to wipe them too):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.local.yml down
```

<details>
<summary>Good to know (how the compose setup works, disk usage, caveats)</summary>

- The stack is [docker-compose.production.yml](docker-compose.production.yml) (app + PostgreSQL) plus [docker-compose.local.yml](docker-compose.local.yml) (the S3 mock). Drop the second `-f` if you don't need image uploads.
- **Production does not actually run Docker** — it's a plain EC2 box. The compose files are kept as a future deployment option and as the quickest way to try dreamingsheep locally.
- The app container uses `network_mode: host`, so it reaches everything under `localhost` — your `.env.local` values work unchanged in and out of Docker.
- ⚠️ **DB password**: the compose PostgreSQL initializes from `POSTGRES_PASSWORD` (default `postgres`), baked into the volume on **first initialization only** — changing it later requires `docker volume rm volume-postgres-dreamingsheep`, which wipes the database.
- Disk: the images add up to ~12GB (`docker images`):

```
REPOSITORY                  TAG      SIZE
dreamingsheep-blitzjs-app   latest   11GB   (image name is historical — the app is plain Next.js now)
postgres                    13.4     533MB
minio/minio                 latest   241MB   (S3 mock)
minio/mc                    latest   117MB   (S3 mock init)
```

</details>

---

## 🔥 Route 3 — everything in Docker, with hot reload

Same containers as route 2, but your working copy is **bind-mounted** into the app
container and it runs `npm run dev` — save a file on the host and the container
recompiles it in a second or two. **Build the image once**, then never again
(until dependencies change). No Node.js or PostgreSQL on your machine.

The only difference from route 2 is one extra `-f docker-compose.dev.yml` in every
command.

### ⟳ Install Docker

1. Install **Docker**, with the Compose v2 plugin — the commands below use `docker compose`, not the old `docker-compose`.
2. (optional) So you don't need `sudo` for every docker command:

```sh
sudo usermod -aG docker <username>   # then log out and log back in
```

### ⟳ Create your env file

3. Copy the example — for the all-Docker routes this minimal recipe is enough:

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

&nbsp;&nbsp;&nbsp;&nbsp;Everything else (AWS, Gmail, reCAPTCHA) can stay empty — sign in with the seeded demo user instead of signing up.

### ⟳ Free up port 5432

4. The compose PostgreSQL maps port 5432, and the app container uses `network_mode: host`, so it connects to whatever answers on `localhost:5432`. If a host PostgreSQL keeps running, the dockerized app will silently talk to _it_ instead of the container:

```sh
sudo lsof -i :5432               # who owns the port?
sudo systemctl stop postgresql   # stop the host PostgreSQL for the Docker session
# later, to get it back: sudo systemctl start postgresql
```

### Build and run

5. Build the dev image — **once** (takes a few minutes; it is tagged `dreamingsheep-blitzjs-app:dev`, so it never clobbers the route-2 production image):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml build
```

6. Start the full stack (app + PostgreSQL + S3 mock):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml -f docker-compose.local.yml up -d
```

7. First run only — create the schema and seed demo data inside the container:

```sh
docker exec -it docker-dreamingsheep bash
npm run migrate:deploy   # applies the committed migrations (non-interactive)
npm run db:seed                 # demo users + symbols + dreams
exit
```

8. Watch it compile (first page load takes a moment — that's `npm run dev` building on demand):

```sh
docker logs -f docker-dreamingsheep
```

9. Open [localhost:3000](http://localhost:3000) and log in with **`zhuangzi@dreamingsheep.net`** / **`zhuangzi`**.
10. Edit anything under `src/` and save. The log shows `wait compiling...` → `event compiled client and server successfully`, and the browser updates on its own — **no rebuild, no restart. You're done.**
11. Stop everything (all volumes survive):

```sh
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml -f docker-compose.local.yml down
```

### What still needs a restart or a rebuild

| you changed…                                         | what to do                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| anything in `src/`, `mailers/`, `test/` …            | nothing — hot reload handles it                                                                            |
| `.env.local`, `next.config.js`, `tailwind.config.js` | `docker compose -f docker-compose.production.yml -f docker-compose.dev.yml restart blitzjs-app`            |
| `db/schema.prisma`                                   | `docker exec -it docker-dreamingsheep npx prisma generate`, then `npm run migrate:deploy` in the container |
| `package.json` / `yarn.lock`                         | rebuild + drop the stale volumes (below)                                                                   |

```sh
# after a dependency change: rebuild, drop the stale volumes, start again
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml build
docker volume rm volume-node-modules-dreamingsheep volume-next-dreamingsheep
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml -f docker-compose.local.yml up -d
```

&nbsp;&nbsp;&nbsp;&nbsp;⚠️ Those two volumes are safe to delete — they are recreated from the image. `volume-postgres-dreamingsheep` is your **database**; deleting that one means re-running step 7.

<details>
<summary>Good to know (how the bind mount works, file watching, caveats)</summary>

- [docker-compose.dev.yml](docker-compose.dev.yml) is an **overlay**: always pass it _after_ `docker-compose.production.yml`, which contributes PostgreSQL and the base app service. It selects the `dev` target of the [Dockerfile](Dockerfile) — the same dependency layers as production, minus `npm run build`.
- Two container-owned directories are shadowed by named volumes so the container's Linux binaries and caches never leak into your host checkout: `/app/node_modules` and `/app/.next`. Everything else under `/app` is your live working copy.
- **File watching**: inotify over a Linux bind mount works out of the box. If edits are somehow _not_ picked up (macOS/Windows Docker Desktop, or the repo on a networked filesystem), start the stack with polling: `WATCHPACK_POLLING=true docker compose … up -d`.
- **Dev, not production**: first page loads are slower and bundles are unminified — that's `npm run dev` doing its job. Use [route 2](#-route-2--everything-in-docker-production-like) to sanity-check a real build.
- ⚠️ **DB password**: the compose PostgreSQL initializes from `POSTGRES_PASSWORD` (default `postgres`), baked into the volume on **first initialization only** — changing it later requires `docker volume rm volume-postgres-dreamingsheep`, which wipes the database.

</details>

---

## 🧰 Docker cheatsheet (routes 2 and 3)

```sh
docker ps                                          # what's running
docker compose -f docker-compose.production.yml ps
docker images
docker rmi <id>
docker logs -f docker-dreamingsheep                # app logs
docker logs docker-postgres-dreamingsheep          # database logs
docker exec -it docker-dreamingsheep bash          # shell inside the app
docker exec -it docker-postgres-dreamingsheep psql -U postgres dreamingsheep   # poke the DB directly
docker volume ls
docker volume rm volume-postgres-dreamingsheep     # wipe the dockerized DB (re-migrate + re-seed after)
docker system prune -a                             # reclaim disk (removes unused images!)
docker compose -f docker-compose.production.yml down --rmi all
```

## 🪣 Local dev services in Docker (S3 mock + PostgreSQL)

Companions for [route 1](#-route-1--natively-nodejs--postgresql-on-your-machine):
run only the _services_ in Docker while the app runs on your machine with
`npm run dev`. (Routes 2 and 3 already include both.)

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

3. Restart the dev server (`npm run dev`) and create a custom symbol with a picture on the Symbols page. Browse the bucket at [localhost:9001](http://localhost:9001) (login `test` / `test1234`).
4. **Production is unaffected**: the S3 client only switches endpoints when `S3_ENDPOINT` is set — leave it unset outside local development.

**PostgreSQL** — if you'd rather not install it natively, run just the database
from the production compose file (mind the port-5432 and password notes in
[route 2](#-route-2--everything-in-docker-production-like)):

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
  (`npm run dev`, or set `E2E_BASE_URL`) and a **seeded local DB** (`npm run db:seed`
  — the flows log in as the demo user and clean up after themselves).
- CI (`.github/workflows/test.yml`) runs lint, type-check and unit tests on every
  PR; the E2E suite is local-only for now.
- Philosophy (see issue #2): test the things that actually break — edge cases over
  coverage percentages.
