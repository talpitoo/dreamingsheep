import { fileURLToPath } from "url"
import { defineConfig } from "vitest/config"

// E2E tests: drive the real app in headless Chromium (puppeteer).
// Prerequisites: `npm run dev` running (localhost:3000 by default, override
// with E2E_BASE_URL) against a locally seeded DB (`npm run db:seed`).
export default defineConfig({
  resolve: {
    alias: {
      src: fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["test/e2e/**/*.e2e.test.ts"],
    environment: "node",
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // one spec file at a time — the flows share the same user/session state
    fileParallelism: false,
  },
})
