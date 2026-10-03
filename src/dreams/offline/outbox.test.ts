import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import {
  clearOutbox,
  enqueueDream,
  MAX_TRANSIENT_ATTEMPTS,
  outboxKey,
  OutboxWriteError,
  readOutbox,
  removeFromOutbox,
  retryOutboxEntry,
  subscribeOutbox,
  syncOutbox,
} from "./outbox"
import type { OutboxStorage, PendingDream } from "./outbox"

const NOW = new Date("2026-09-27T10:00:00.000Z")

function fakeStorage(): OutboxStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("outbox", () => {
  it("enqueueDream + readOutbox round-trip values and Date, preserving insertion order", () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { title: "first" })
    const b = enqueueDream(storage, 1, { title: "second" })
    const c = enqueueDream(storage, 1, { title: "third" })

    const entries = readOutbox(storage, 1)

    expect(entries.map((entry) => entry.clientId)).toEqual([a.clientId, b.clientId, c.clientId])
    expect(entries[0]!.values).toEqual({ title: "first" })
    expect(entries[0]!.queuedAt).toBeInstanceOf(Date)
    expect(entries[0]!.queuedAt.getTime()).toBe(NOW.getTime())
    expect(entries[2]!.values).toEqual({ title: "third" })
  })

  it("readOutbox returns [] when the stored payload is corrupt JSON", () => {
    const storage = fakeStorage()
    storage.setItem(outboxKey(1), "{oops")

    expect(readOutbox(storage, 1)).toEqual([])
  })

  it("readOutbox drops an element that lost its shape and keeps the rest, so one bad write cannot brick /dreams", () => {
    const storage = fakeStorage()
    const good: PendingDream = {
      clientId: "ok-1",
      userId: 1,
      values: { title: "kept" },
      queuedAt: NOW,
    }
    storage.setItem(
      outboxKey(1),
      superjson.stringify([
        null,
        "text",
        { clientId: "no-values", userId: 1, queuedAt: NOW },
        { userId: 1, values: { title: "no id" }, queuedAt: NOW },
        good,
      ])
    )

    expect(readOutbox(storage, 1)).toEqual([good])
  })

  it("enqueueDream wraps a storage write failure or a non-positive userId in OutboxWriteError", () => {
    const storage = fakeStorage()
    const brokenStorage: OutboxStorage = {
      ...storage,
      setItem: () => {
        throw new Error("quota exceeded")
      },
    }

    expect(() => enqueueDream(brokenStorage, 1, { title: "x" })).toThrow(OutboxWriteError)
    expect(() => enqueueDream(storage, 0, { title: "x" })).toThrow(OutboxWriteError)
  })

  it("removeFromOutbox removes only the matching clientId; clearOutbox empties the queue", () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { title: "a" })
    const b = enqueueDream(storage, 1, { title: "b" })
    const c = enqueueDream(storage, 1, { title: "c" })

    removeFromOutbox(storage, 1, b.clientId)

    expect(readOutbox(storage, 1).map((entry) => entry.clientId)).toEqual([a.clientId, c.clientId])

    clearOutbox(storage, 1)

    expect(readOutbox(storage, 1)).toEqual([])
  })

  it("syncOutbox happy path sends every entry oldest-first, empties the outbox, and notifies once per removal", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    const sentOrder: unknown[] = []
    const send = async (values: Record<string, unknown>) => {
      sentOrder.push(values)
      return { ok: true }
    }
    const notifications: number[] = []
    const unsubscribe = subscribeOutbox(() => notifications.push(notifications.length))

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 3, authRequired: false, blocked: false })
    expect(sentOrder).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }])
    expect(readOutbox(storage, 1)).toEqual([])
    expect(notifications).toHaveLength(3)
    unsubscribe()
  })

  it("syncOutbox stops on a network TypeError, leaving the remaining entries exactly as they were", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    const b = enqueueDream(storage, 1, { n: 2 })
    const c = enqueueDream(storage, 1, { n: 3 })
    let calls = 0
    const send = async () => {
      calls++
      if (calls === 2) throw new TypeError("Failed to fetch")
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: true })
    // Full-entry equality (not just a `.values` projection) proves entries 2+3
    // carry no stray mutation (e.g. an accidental lastError/attempts write).
    expect(readOutbox(storage, 1)).toEqual([b, c])
  })

  it("syncOutbox stops on an AuthenticationError, leaving the queue byte-for-byte untouched", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const before = storage.getItem(outboxKey(1))
    const send = async () => {
      throw Object.assign(new Error("x"), { name: "AuthenticationError" })
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 0, authRequired: true, blocked: false })
    expect(storage.getItem(outboxKey(1))).toBe(before)
  })

  it("syncOutbox marks a permanently-rejected entry (AuthorizationError) with lastError, keeps going, never retries it, and notifies on both the removal and the lastError write", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    const send = vi.fn(async (values: Record<string, unknown>) => {
      if (values.n === 1) throw Object.assign(new Error("nope"), { name: "AuthorizationError" })
      return { ok: true }
    })
    const notifications: number[] = []
    const unsubscribe = subscribeOutbox(() => notifications.push(notifications.length))

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 2, authRequired: false, blocked: false })
    expect(notifications).toHaveLength(3) // 1 lastError write (entry a) + 2 removals (b, c)
    unsubscribe()
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.clientId).toBe(a.clientId)
    expect(remaining[0]!.lastError).toBe("AuthorizationError: nope")

    const second = await syncOutbox(storage, 1, send)

    expect(second).toEqual({ synced: 0, authRequired: false, blocked: false })
    expect(send).toHaveBeenCalledTimes(3)
  })

  it("syncOutbox treats a server error (500) as a counted transient failure: stops, bumps attempts, leaves lastError unset", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const send = async () => {
      throw Object.assign(new Error("RPC createDream failed (500)"), { statusCode: 500 })
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 0, authRequired: false, blocked: true })
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(2)
    expect(remaining[0]!.clientId).toBe(a.clientId)
    expect(remaining[0]!.attempts).toBe(1)
    expect(remaining[0]!.lastError).toBeUndefined()
    expect(remaining[1]!.attempts).toBeUndefined()
  })

  it.each([408, 429, 502, 503, 504])(
    "syncOutbox waits out a gateway outage or a 'later' answer (%i): blocked, attempts untouched however many runs it lasts",
    async (statusCode) => {
      const storage = fakeStorage()
      const send = vi.fn(async () => {
        throw Object.assign(new Error(`RPC createDream failed (${statusCode})`), { statusCode })
      })

      // a fresh entry keeps attempts undefined, past the point a counted failure would park it …
      const fresh = enqueueDream(storage, 1, { n: 1 })
      for (let run = 0; run <= MAX_TRANSIENT_ATTEMPTS; run++) {
        expect(await syncOutbox(storage, 1, send)).toEqual({
          synced: 0,
          authRequired: false,
          blocked: true,
        })
      }
      expect(readOutbox(storage, 1)).toEqual([fresh])

      // … and one that earlier failures left a single attempt short of the cap keeps its count
      clearOutbox(storage, 1)
      const worn: PendingDream = {
        clientId: "worn-1",
        userId: 1,
        values: { n: 2 },
        queuedAt: NOW,
        attempts: MAX_TRANSIENT_ATTEMPTS - 1,
      }
      storage.setItem(outboxKey(1), superjson.stringify([worn]))

      expect(await syncOutbox(storage, 1, send)).toEqual({
        synced: 0,
        authRequired: false,
        blocked: true,
      })
      expect(readOutbox(storage, 1)).toEqual([worn])
    }
  )

  it("syncOutbox gives up after MAX_TRANSIENT_ATTEMPTS, stamps lastError, and continues to the next entry", async () => {
    const storage = fakeStorage()
    const stale: PendingDream = {
      clientId: "stale-1",
      userId: 1,
      values: { n: 1 },
      queuedAt: NOW,
      attempts: MAX_TRANSIENT_ATTEMPTS - 1,
    }
    storage.setItem(outboxKey(1), superjson.stringify([stale]))
    enqueueDream(storage, 1, { n: 2 })
    const send = async (values: Record<string, unknown>) => {
      if (values.n === 1) throw new Error("still down")
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: false })
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.clientId).toBe("stale-1")
    expect(remaining[0]!.attempts).toBe(MAX_TRANSIENT_ATTEMPTS)
    expect(remaining[0]!.lastError).toBe(
      `gave up after ${MAX_TRANSIENT_ATTEMPTS} attempts: Error: still down`
    )
  })

  it("syncOutbox treats a ZodError as permanent (by name, despite its 500 status): lastError immediately, continues", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const send = async (values: Record<string, unknown>) => {
      if (values.n === 1) {
        throw Object.assign(new Error("bad"), { name: "ZodError", statusCode: 500 })
      }
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: false })
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.clientId).toBe(a.clientId)
    expect(remaining[0]!.lastError).toBe("ZodError: bad")
  })

  it("syncOutbox treats a 404 NotFoundError-shaped rejection as permanent: lastError, continues", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const send = async (values: Record<string, unknown>) => {
      if (values.n === 1) {
        throw Object.assign(new Error("This could not be found"), {
          name: "NotFoundError",
          statusCode: 404,
        })
      }
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: false })
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.clientId).toBe(a.clientId)
    expect(remaining[0]!.lastError).toBe("NotFoundError: This could not be found")
  })

  it("syncOutbox stops on a CSRFTokenMismatchError like an AuthenticationError, queue byte-for-byte untouched", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const before = storage.getItem(outboxKey(1))
    const send = async () => {
      throw Object.assign(new Error("CSRF token mismatch"), {
        name: "CSRFTokenMismatchError",
        statusCode: 401,
      })
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 0, authRequired: true, blocked: false })
    expect(storage.getItem(outboxKey(1))).toBe(before)
  })

  it("retryOutboxEntry clears lastError and attempts and notifies; the next sync sends the entry again", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    let shouldFail = true
    const send = vi.fn(async () => {
      if (shouldFail) throw Object.assign(new Error("bad"), { name: "ZodError", statusCode: 500 })
      return { ok: true }
    })

    await syncOutbox(storage, 1, send)
    expect(readOutbox(storage, 1)[0]!.lastError).toBe("ZodError: bad")

    const notifications: number[] = []
    const unsubscribe = subscribeOutbox(() => notifications.push(notifications.length))

    retryOutboxEntry(storage, 1, a.clientId)

    expect(notifications).toHaveLength(1)
    unsubscribe()
    const retried = readOutbox(storage, 1)[0]!
    expect(retried.lastError).toBeUndefined()
    expect(retried.attempts).toBeUndefined()

    shouldFail = false
    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: false })
    expect(readOutbox(storage, 1)).toEqual([])
    expect(send).toHaveBeenCalledTimes(2)
  })

  it("syncOutbox re-reads storage before each entry, so a concurrent tab's removal wins (two-tab race)", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    const b = enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    const sent: unknown[] = []
    const send = async (values: Record<string, unknown>) => {
      sent.push(values)
      if (values.n === 1) removeFromOutbox(storage, 1, b.clientId)
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 2, authRequired: false, blocked: false })
    expect(sent).toEqual([{ n: 1 }, { n: 3 }])
    expect(readOutbox(storage, 1)).toEqual([])
  })

  it("subscribeOutbox notifies on enqueue/remove/clear; unsubscribe stops further notifications", () => {
    const storage = fakeStorage()
    const notifications: number[] = []
    const unsubscribe = subscribeOutbox(() => notifications.push(notifications.length))

    const entry = enqueueDream(storage, 1, { title: "x" })
    expect(notifications).toHaveLength(1)

    removeFromOutbox(storage, 1, entry.clientId)
    expect(notifications).toHaveLength(2)

    enqueueDream(storage, 1, { title: "y" })
    clearOutbox(storage, 1)
    expect(notifications).toHaveLength(4)

    unsubscribe()
    enqueueDream(storage, 1, { title: "z" })
    expect(notifications).toHaveLength(4)
  })
})
