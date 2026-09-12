import { chromium, FullConfig } from "@playwright/test"
import fs from "fs"
import path from "path"
import { AUTH_FILE, Meta, META_FILE, setCheckboxSetting, SNAPSHOTS_DIR, ZHUANGZI } from "./helpers"

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000"
  try {
    await fetch(baseURL)
  } catch {
    throw new Error(
      `dreamingsheep is not running at ${baseURL} — start the production build first:\n` +
        `  nvm use 22 && yarn build && yarn start   (seeded DB: npm run db:seed)\n` +
        `or point VISUAL_BASE_URL at a running instance.`
    )
  }

  // The run parameters are recorded once and then REUSED by every later run — including
  // --update-snapshots ones. A baseline taken with the clock on the seed day and a compare run
  // taken with the clock on "today" would differ everywhere, so the stored value always wins over
  // the current date; only an explicit VISUAL_SEED_DATE / VISUAL_CAPTURE overrides it (that is how
  // you re-record after re-seeding the database).
  const stored: Partial<Meta> = fs.existsSync(META_FILE)
    ? JSON.parse(fs.readFileSync(META_FILE, "utf8"))
    : {}
  const today = new Date().toISOString().slice(0, 10)
  const meta: Meta = {
    seedDate: process.env.VISUAL_SEED_DATE ?? stored.seedDate ?? today,
    capture:
      (process.env.VISUAL_CAPTURE as Meta["capture"] | undefined) ?? stored.capture ?? "fullpage",
  }
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + "\n")
  // eslint-disable-next-line no-console
  console.log(`[visual] seedDate ${meta.seedDate}, capture ${meta.capture}, base ${baseURL}`)
  if (meta.seedDate === today && !process.env.VISUAL_SEED_DATE && !stored.seedDate) {
    // eslint-disable-next-line no-console
    console.warn(
      "[visual] no seed date recorded — assuming the database was seeded today. If it was not, the\n" +
        "         frozen clock will not line up with the seeded dreams: delete __snapshots__/meta.json\n" +
        "         and re-run with VISUAL_SEED_DATE=YYYY-MM-DD (the day `npm run db:seed` ran)."
    )
  }

  // log in once; every authenticated spec starts from this storage state
  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL })
  await page.goto("/")
  await page.fill('input[name="email"]', ZHUANGZI.email)
  await page.fill('input[name="password"]', ZHUANGZI.password)
  await page.keyboard.press("Enter")
  await page.waitForURL("**/dreams**", { timeout: 60_000 })
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })

  // Every feature is opted IN for the whole suite, so nothing stays hidden behind a setting: the
  // dreams page gets its bedtime/wake-up form, the stats page its advanced dashboard and sleep
  // chart, and the settings cards show their checked state. (The suite leaves both switches on in
  // the demo user's row — stats.visual.test.ts borrows advanced-charting for one opted-out shot
  // and puts it straight back.)
  await setCheckboxSetting(page, "bedtime", true)
  await setCheckboxSetting(page, "advanced-charting", true)
  await browser.close()
}
