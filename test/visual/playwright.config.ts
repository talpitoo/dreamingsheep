import { defineConfig } from "@playwright/test"
import path from "path"

/**
 * Visual regression suite — see test/visual/README.md (issue #1).
 *
 * Every breakpoint edge in the codebase, both sides, plus 375 as a common-phone sample.
 * tailwind screens: xsmax ≤ 320 (inclusive), sm 600, md 900, lg 1200 — identical to MUI's
 * defaults (createTheme().breakpoints.values), so one matrix covers sx and className rules.
 * Nothing in src/ reacts above 1200px. Heights are device-ish; captures are full-page anyway.
 */
export const VIEWPORTS = [
  { name: "w320", width: 320, height: 568 },
  { name: "w321", width: 321, height: 568 },
  { name: "w375", width: 375, height: 667 },
  { name: "w599", width: 599, height: 900 },
  { name: "w600", width: 600, height: 900 },
  { name: "w899", width: 899, height: 900 },
  { name: "w900", width: 900, height: 900 },
  { name: "w1199", width: 1199, height: 900 },
  { name: "w1200", width: 1200, height: 900 },
]

export default defineConfig({
  testDir: __dirname,
  testMatch: /.*\.visual\.test\.ts$/,
  outputDir: path.join(__dirname, "test-results"),
  snapshotPathTemplate: "{testDir}/__snapshots__/{projectName}/{testFileName}/{arg}{ext}",
  // one worker: stats.visual.test.ts switches two Settings flags on and off for the whole user,
  // and a busy machine changes rendering timings
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  globalSetup: path.join(__dirname, "global-setup.ts"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(__dirname, "playwright-report"), open: "never" }],
  ],
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixels: 0,
      stylePath: path.join(__dirname, "freeze.css"),
    },
  },
  use: {
    baseURL: process.env.VISUAL_BASE_URL || "http://localhost:3000",
    browserName: "chromium",
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "Europe/Budapest",
    storageState: path.join(__dirname, ".auth", "zhuangzi.json"),
    trace: "retain-on-failure",
  },
  projects: VIEWPORTS.map((viewport) => ({
    name: viewport.name,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
})
