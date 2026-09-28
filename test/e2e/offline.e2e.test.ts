import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { Browser, Page } from "puppeteer"
import superjson from "superjson"
import {
  BASE,
  bodyText,
  clickButtonWithText,
  clickTrashInCard,
  confirmDeletionDialog,
  launchBrowser,
  login,
  newPage,
  sleep,
  submitForm,
  waitForText,
} from "./helpers"

// A dream written offline waits on the device and syncs once the connection is back.
//
// The dev server registers no service worker, and `next dev` fetches a route's code on every
// navigation to it, so offline the app cannot leave the page it is on. Every offline step below
// stays on /dreams and moves between days through same-route ?date= pushes only (the calendar's
// month arrow, the sheep). Offline reloads and the cached shell need a production build.

interface Day {
  iso: string // the ?date= value
  dayOfMonth: number
  midnightUtc: string // the day's local midnight, as the dream list's query sends it
}

// "today" is the browser's call, not the node process's: the page computes its own dates
function browserDay(page: Page, which: "today" | "first of last month"): Promise<Day> {
  return page.evaluate((which: string) => {
    const now = new Date()
    const date =
      which === "today"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      iso: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-"),
      dayOfMonth: date.getDate(),
      midnightUtc: date.toISOString(),
    }
  }, which)
}

// polls a page state until it is acceptable, then hands it over for the assertions
async function until<T>(read: () => Promise<T>, accept: (value: T) => boolean, what: string) {
  const deadline = Date.now() + 30_000
  for (;;) {
    const value = await read()
    if (accept(value)) return value
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}, last seen: ${JSON.stringify(value)}`)
    }
    await sleep(100)
  }
}

// the route change has committed: the URL and the calendar's selected day agree
async function waitForDay(page: Page, day: Day) {
  await page.waitForFunction(
    (iso: string, dayOfMonth: number) =>
      new URLSearchParams(location.search).get("date") === iso &&
      [...document.querySelectorAll('button[role="gridcell"][aria-selected="true"]')].some(
        (button) => button.textContent === String(dayOfMonth)
      ),
    { timeout: 30_000 },
    day.iso,
    day.dayOfMonth
  )
}

// the server answered this day's dream list, so the day is in the query cache
function dayListLoaded(page: Page, day: Day) {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/rpc/getDreams" &&
      !!response.request().postData()?.includes(day.midnightUtc) &&
      response.ok(),
    { timeout: 30_000 }
  )
}

// DOM clicks: `scroll-behavior: smooth` makes coordinate clicks below the fold miss
async function clickPreviousMonth(page: Page) {
  const clicked = await page.evaluate(() => {
    const arrow = document.querySelector(
      'button[aria-label="Previous month"]'
    ) as HTMLElement | null
    arrow?.click()
    return !!arrow
  })
  if (!clicked) throw new Error("The calendar has no previous-month arrow")
}

async function clickSheep(page: Page) {
  const clicked = await page.evaluate(() => {
    const link = document.querySelector('img[alt="dreams sheep"]')?.closest("a")
    link?.click()
    return !!link
  })
  if (!clicked) throw new Error("The sheep links nowhere (already on today?)")
}

// the in-flow banner sits right under the header; the corner ribbon is decorative (aria-hidden)
function offlineCues(page: Page) {
  return page.evaluate(() => ({
    banner: document.querySelector("header + .MuiAlert-root")?.textContent ?? null,
    ribbon: [...document.querySelectorAll('[aria-hidden="true"]')].some(
      (element) =>
        element.textContent?.trim() === "offline" && getComputedStyle(element).position === "fixed"
    ),
  }))
}

function snackbarMessages(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".MuiSnackbarContent-message")].map(
      (message) => message.textContent ?? ""
    )
  )
}

// the cards carrying this title: a pending one waits to sync, a synced one is a normal entry
// (the one with a trash button)
function dreamCards(page: Page, title: string) {
  return page.evaluate(
    (title: string) =>
      [...document.querySelectorAll(".MuiCard-root")]
        .filter((card) => card.textContent?.includes(title))
        .map((card) =>
          card.textContent?.includes("waiting to sync")
            ? "pending"
            : card.querySelector("span.lucidicon-trash")
            ? "synced"
            : "unknown"
        ),
    title
  )
}

// a day with dreams is tinted, but today's own colour and the selected day's fill paint over the
// tint: the ::after that DreamCalendarDay gives dream days only is the mark every day keeps
function isMarkedInCalendar(page: Page, day: Day) {
  return page.evaluate((dayOfMonth: number) => {
    const button = [...document.querySelectorAll('button[role="gridcell"]')].find(
      (candidate) => candidate.textContent === String(dayOfMonth)
    )
    if (!button) throw new Error(`Day ${dayOfMonth} is not in the calendar`)
    return getComputedStyle(button, "::after").content !== "none"
  }, day.dayOfMonth)
}

function deviceStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage).map((key) => [key, localStorage.getItem(key) ?? ""])
    )
  )
}

describe("offline dreams: the outbox round trip", () => {
  let browser: Browser
  let page: Page
  const title = `offline e2e dream ${Date.now()}`
  const description = "the wifi was asleep too 🐑"
  let today: Day
  let otherDay: Day
  let outboxKey = "" // ds.outbox.<userId>, known once the dream is queued

  beforeAll(async () => {
    browser = await launchBrowser()
    page = await newPage(browser)
    await login(page)
    today = await browserDay(page, "today")
    otherDay = await browserDay(page, "first of last month")
  })
  afterAll(async () => {
    // safety net if a step failed: a dream still queued must not sync behind our back, and one
    // that already synced is deleted
    try {
      await page.evaluate(() =>
        Object.keys(localStorage)
          .filter((key) => key.startsWith("ds.outbox."))
          .forEach((key) => localStorage.removeItem(key))
      )
    } catch (error) {
      // best effort only
    }
    try {
      await page.setOfflineMode(false)
      await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
        waitUntil: "networkidle2",
      })
      await waitForText(page, "results")
      if ((await bodyText(page)).includes(title)) {
        await clickTrashInCard(page, title)
        await confirmDeletionDialog(page)
        await waitForText(page, title, { absent: true })
      }
    } catch (error) {
      // best effort only
    }
    await browser?.close()
  })

  it("logging in lands on today's journal, with no offline cues", async () => {
    await waitForDay(page, today)
    expect(await offlineCues(page)).toEqual({ banner: null, ribbon: false })
  })

  it("online, the month arrow leads to another day and the sheep back (both cached)", async () => {
    // offline, a day shows only if it was fetched before: visit the one the offline trip goes to
    await Promise.all([
      dayListLoaded(page, otherDay),
      clickPreviousMonth(page),
      waitForDay(page, otherDay),
    ])
    await Promise.all([dayListLoaded(page, today), clickSheep(page), waitForDay(page, today)])
  })

  it("offline, the banner under the header and the corner ribbon appear", async () => {
    await page.setOfflineMode(true)
    const cues = await until(
      () => offlineCues(page),
      (cues) => cues.banner !== null && cues.ribbon,
      "the offline banner and ribbon"
    )
    expect(cues.banner).toMatch(/^you're offline/)
  })

  it("offline, a new dream is tucked away on the device, pending on its day", async () => {
    // the seed never files a dream on the current day, so nothing marks today yet
    expect(await isMarkedInCalendar(page, today), "today already has a dream in this DB").toBe(
      false
    )

    await clickButtonWithText(page, "New dream")
    await page.waitForSelector('#create-dream input[name="title"]', { timeout: 15_000 })
    await page.type('#create-dream input[name="title"]', title)
    await page.type('#create-dream textarea[name="description"]', description)
    await submitForm(page, "create-dream")

    await until(
      () => snackbarMessages(page),
      (messages) => messages.some((message) => message.includes("tucked away on this device")),
      "the tucked-away snackbar"
    )
    const storage = await deviceStorage(page)
    const outboxKeys = Object.keys(storage).filter((key) => key.startsWith("ds.outbox."))
    expect(outboxKeys).toHaveLength(1)
    outboxKey = outboxKeys[0] ?? ""
    expect(outboxKey).toMatch(/^ds\.outbox\.\d+$/)
    const queued = superjson.parse<{ values: Record<string, unknown> }[]>(storage[outboxKey] ?? "")
    expect(queued.map(({ values }) => [values.title, values.description])).toEqual([
      [title, description],
    ])

    expect(await dreamCards(page, title)).toEqual(["pending"])
    expect(await isMarkedInCalendar(page, today)).toBe(true)
    expect((await offlineCues(page)).banner).toContain("1 dream")
  })

  it("offline, the pending dream survives a trip to another day and back", async () => {
    await clickPreviousMonth(page)
    await waitForDay(page, otherDay)
    // that day came from the cache, and a pending dream is listed on its own day only
    expect(await bodyText(page)).not.toContain("isn't cached on this device")
    expect(await dreamCards(page, title)).toEqual([])

    await clickSheep(page)
    await waitForDay(page, today)
    expect(await dreamCards(page, title)).toEqual(["pending"])
    expect(await isMarkedInCalendar(page, today)).toBe(true)
  })

  it("back online, the dream syncs and turns into a normal entry", async () => {
    await page.setOfflineMode(false)
    await until(
      () => snackbarMessages(page),
      (messages) => messages.some((message) => message.includes("1 dream made it home")),
      "the made-it-home snackbar"
    )
    // the pending card gives way to the synced entry once the day's list refetches
    await until(
      () => dreamCards(page, title),
      (cards) => cards.length === 1 && cards[0] === "synced",
      "the synced entry"
    )
    expect(await bodyText(page)).toContain(description)
    expect(await offlineCues(page)).toEqual({ banner: null, ribbon: false })

    const storage = await deviceStorage(page)
    const outbox = storage[outboxKey]
    expect(outbox ? superjson.parse(outbox) : []).toEqual([])
    // the read cache the next offline start hydrates from, kept while online
    expect(storage[outboxKey.replace("ds.outbox.", "ds.queries.")]).toContain('"getDreams"')
  })

  it("deletes the synced dream and it disappears", async () => {
    await clickTrashInCard(page, title)
    await confirmDeletionDialog(page)
    await waitForText(page, title, { absent: true })

    await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
      waitUntil: "networkidle2",
    })
    await waitForText(page, "0 results")
  })
})
