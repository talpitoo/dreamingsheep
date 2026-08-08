# Two build targets share the same dependency layers:
#   base       — Node 22 + yarn install + prisma generate
#   dev        — `next dev` with the source bind-mounted from the host (hot reload)
#   production — `next build` + `next start` (the default target, last stage)
#
# See docker-compose.production.yml (production) and docker-compose.dev.yml (dev).

# Use an official Node.js runtime as the base image
FROM node:22 AS base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container (and yarn.lock)
COPY package*.json yarn.lock ./

# Copy the entire db/ folder and its contents to the container
COPY db/ ./db/

# Install application dependencies
RUN yarn install

# Generate Prisma Client
RUN npx prisma generate

# ---------------------------------------------------------------------------
# dev target — no source is copied in: docker-compose.dev.yml bind-mounts the
# repo over /app, so edits on the host are picked up by the Next watcher
# ---------------------------------------------------------------------------
FROM base AS dev

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0"]

# ---------------------------------------------------------------------------
# production target (the default — it is the last stage)
# ---------------------------------------------------------------------------
FROM base AS production

# Copy the rest of the application code to the container
COPY . .

# Build the Next.js app
RUN yarn build

# Copy the 2 images used in the email templates, their URLs would be:
# http://localhost:3000/_next/static/media/sheep-dreamingsheep.png
# http://localhost:3000/_next/static/media/title-dreamingsheep.png
COPY public/assets/title-dreamingsheep.png public/assets/sheep-dreamingsheep.png ./.next/static/media/

# Expose the port your app listens on
EXPOSE 3000

# Set hostname to 0.0.0.0 to allow external connections
ENV HOSTNAME=0.0.0.0

# Start the Next.js app
CMD ["npx", "next", "start", "--hostname", "0.0.0.0"]
