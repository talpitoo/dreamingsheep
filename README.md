![dreamingsheep](https://dreamingsheep.net/assets/cover1200x630.jpg "dreamingsheep")

# 🐏 _dreamingsheep_

## Getting Started (on your local machine)

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
15. Open [localhost:3000](http://localhost:3000) with your browser to see the result.
16. If you want to test emails 1) sign up with a real email (you should receive a welcome email with a confirmation code), then sign out and initiate the forgot password flow (you should receive a forgot password email with a token).
17. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md). For the project roadmap, see [ROADMAP.md](ROADMAP.md).

## 🐋 Getting Started with Docker (on your local machine)

1. Install Docker.
2. Install the `docker-compose` command-line tool.
3. (optional) Run `sudo usermod -aG docker <username>` (then log out, log in) or run all docker commands with `sudo`.
4. Build the docker containers (only once): `docker compose -f docker-compose.production.yml build`.
5. Run `docker compose -f docker-compose.production.yml up -d`.
6. Manual seeding the DB:

```sh
# Optional commands to check if the dreamingsheep database exists:
# docker exec -it docker-postgres-dreamingsheep bash
# psql -U postgres
# \l
# \c dreamingsheep
# \dt
# \q
# exit

docker exec -it docker-dreamingsheep bash
blitz prisma migrate dev
blitz db seed
exit

# Optional coomands if the 5432 port is taken by the local Postgres:
# sudo lsof -i :5432
# sudo systemctl stop postgresql
# sudo systemctl start postgresql
```

7. Open [localhost:3000](http://localhost:3000) and you should see the dreamingsheep landing page.
8. (optional) Run `docker compose -f docker-compose.production.yml down` to stop and remove containers, networks, and volumes created by the previous command.
9. (optional) All the docker images will require ~7GB of space:

```
REPOSITORY                        TAG       IMAGE ID       CREATED          SIZE
dreamingsheep_blitzjs-app         latest    5d3e3afd0a22   8 minutes ago    6.16GB
postgres                          13.4      113197da0347   23 months ago    371MB
```

10. (optional) Other useful docker commands:

```sh
docker ps
docker compose -f docker-compose.production.yml ps
docker images
docker rmi <id>
docker logs docker-dreamingsheep
docker system prune -a
docker volume prune
docker compose down --rmi all
docker volume ls
docker volume rm my_volume
docker exec -it docker-postgres-dreamingsheep bash
docker exec -it docker-dreamingsheep bash
```
