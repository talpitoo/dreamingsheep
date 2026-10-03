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

// the one edit in progress (its card no longer shows the title as text — it sits in the input)
function editState(page: Page) {
  return page.evaluate(() => {
    const form = document.querySelector('form[id^="update-dream_"]') as HTMLFormElement | null
    const card = form?.closest(".MuiCard-root") as HTMLElement | null
    const buttons = card ? [...card.querySelectorAll("button")] : []
    const update = buttons.find((button) => button.textContent?.trim() === "Update")
    return {
      mounted: !!form,
      titleValue:
        (form?.querySelector('input[name="title"]') as HTMLInputElement | null)?.value ?? null,
      cancel: buttons.some((button) => button.textContent?.trim() === "Cancel"),
      update: update ? (update.disabled ? "disabled" : "enabled") : "absent",
      trash: !!card?.querySelector("span.lucidicon-trash"),
    }
  })
}

async function clickPencilInCard(page: Page, title: string) {
  const clicked = await page.evaluate((title: string) => {
    const card = [...document.querySelectorAll(".MuiCard-root")].find((candidate) =>
      candidate.textContent?.includes(title)
    )
    const pencil = card?.querySelector("span.lucidicon-pencil")?.closest("button")
    ;(pencil as HTMLElement | undefined)?.click()
    return !!pencil
  }, title)
  if (!clicked) throw new Error(`No pencil in the card "${title}"`)
}

async function clickCancelInEdit(page: Page) {
  const clicked = await page.evaluate(() => {
    const card = document.querySelector('form[id^="update-dream_"]')?.closest(".MuiCard-root")
    const cancel = [...(card?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent?.trim() === "Cancel"
    )
    ;(cancel as HTMLElement | undefined)?.click()
    return !!cancel
  })
  if (!clicked) throw new Error("No Cancel in the open edit")
}

// the desktop account dropdown (the pages open at 1280px wide), then its Sign out entry
async function clickSignOut(page: Page) {
  await page.click('button[aria-label="Account of current user"]')
  await page.waitForSelector('[role="menu"]', { timeout: 10_000 })
  const clicked = await page.evaluate(() => {
    const item = [...document.querySelectorAll('[role="menuitem"]')].find(
      (candidate) => candidate.textContent?.trim() === "Sign out"
    )
    ;(item as HTMLElement | undefined)?.click()
    return !!item
  })
  if (!clicked) throw new Error("No Sign out entry in the account menu")
}

function deleteDialogState(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector(".MuiDialog-root") as HTMLElement | null
    const buttons = dialog ? [...dialog.querySelectorAll("button")] : []
    const confirm = buttons.find((button) => button.textContent?.trim() !== "Cancel")
    return {
      open: !!dialog && dialog.innerText.includes("Delete dream?"),
      deleteDisabled: !!confirm?.disabled,
      hint: dialog?.innerText.includes("deleting needs a connection") ?? false,
    }
  })
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

  it("offline, a new dream is saved on the device, pending on its day", async () => {
    // whatever the DB holds for today (the seed has nothing, a tester may have added dreams), the
    // assertions below key on this run's unique title — the calendar mark is only proven by the
    // pending dream when the day started unmarked
    const markedBefore = await isMarkedInCalendar(page, today)

    await clickButtonWithText(page, "New dream")
    await page.waitForSelector('#create-dream input[name="title"]', { timeout: 15_000 })
    await page.type('#create-dream input[name="title"]', title)
    await page.type('#create-dream textarea[name="description"]', description)
    await submitForm(page, "create-dream")

    await until(
      () => snackbarMessages(page),
      (messages) => messages.some((message) => message.includes("saved on this device")),
      "the saved-on-this-device snackbar"
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
    expect(
      await isMarkedInCalendar(page, today),
      markedBefore ? "stayed marked" : "pending mark"
    ).toBe(true)
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
      (messages) => messages.some((message) => message.includes("1 offline dream synced")),
      "the synced snackbar"
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

  it("an edit opened online keeps its text offline, read-only, and sign out is refused offline", async () => {
    await clickPencilInCard(page, title)
    await page.waitForSelector('form[id^="update-dream_"] input[name="title"]', { timeout: 15_000 })
    await page.type('form[id^="update-dream_"] input[name="title"]', " (offline edit)")
    expect(await editState(page)).toMatchObject({
      mounted: true,
      update: "enabled",
      trash: true,
    })

    await page.setOfflineMode(true)
    const edit = await until(
      () => editState(page),
      (state) => state.update === "disabled",
      "the open edit going read-only"
    )
    // the form stays with what was typed: a connection drop never discards an edit
    expect(edit).toEqual({
      mounted: true,
      titleValue: `${title} (offline edit)`,
      cancel: true,
      update: "disabled",
      trash: false,
    })

    // the session cookie is HttpOnly — only the server can end a session, so sign out waits
    await clickSignOut(page)
    await until(
      () => snackbarMessages(page),
      (messages) => messages.some((message) => message.includes("signing out needs a connection")),
      "the refused sign-out notice"
    )
    expect((await bodyText(page)).toLowerCase()).toContain("zhuangzi")
    expect(
      (await deviceStorage(page))[outboxKey.replace("ds.outbox.", "ds.queries.")]
    ).toBeDefined()

    await page.setOfflineMode(false)
    await until(
      () => editState(page),
      (state) => state.update === "enabled",
      "the open edit back online"
    )
    await clickCancelInEdit(page)
    await until(
      () => editState(page),
      (state) => !state.mounted,
      "the edit closed"
    )
    expect(await dreamCards(page, title)).toEqual(["synced"])
  })

  it("the delete dialog refuses offline, then deletes the synced dream online", async () => {
    await clickTrashInCard(page, title)
    await until(
      () => deleteDialogState(page),
      (state) => state.open,
      "the delete dialog"
    )
    await page.setOfflineMode(true)
    const refused = await until(
      () => deleteDialogState(page),
      (state) => state.deleteDisabled,
      "the delete dialog refusing offline"
    )
    expect(refused).toEqual({ open: true, deleteDisabled: true, hint: true })
    await page.setOfflineMode(false)
    await until(
      () => deleteDialogState(page),
      (state) => !state.deleteDisabled,
      "the delete dialog back online"
    )
    await confirmDeletionDialog(page)
    await waitForText(page, title, { absent: true })

    await page.goto(`${BASE}/search?q=${encodeURIComponent(title)}`, {
      waitUntil: "networkidle2",
    })
    await waitForText(page, "0 results")
  })
})
