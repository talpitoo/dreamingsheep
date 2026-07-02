import { fileURLToPath } from "url"
import { defineConfig } from "vitest/config"

// Unit tests: pure helpers and zod schemas only — fast, no database, no server.
// The "db" alias points straight at @prisma/client so importing enums/types
// never instantiates the Prisma client (db/index.ts would).
export default defineConfig({
  resolve: {
    alias: {
      db: fileURLToPath(new URL("./node_modules/@prisma/client", import.meta.url)),
      src: fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
})
