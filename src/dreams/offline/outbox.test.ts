import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  clearOutbox,
  enqueueDream,
  outboxKey,
  OutboxWriteError,
  readOutbox,
  removeFromOutbox,
  subscribeOutbox,
  syncOutbox,
} from "./outbox"
import type { OutboxStorage } from "./outbox"

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

  it("syncOutbox happy path sends every entry oldest-first and empties the outbox", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    const sentOrder: unknown[] = []
    const send = async (values: Record<string, unknown>) => {
      sentOrder.push(values)
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 3, authRequired: false, blocked: false })
    expect(sentOrder).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }])
    expect(readOutbox(storage, 1)).toEqual([])
  })

  it("syncOutbox stops on a network TypeError, leaving the rest of the queue untouched", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    let calls = 0
    const send = async () => {
      calls++
      if (calls === 2) throw new TypeError("Failed to fetch")
      return { ok: true }
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 1, authRequired: false, blocked: true })
    expect(readOutbox(storage, 1).map((entry) => entry.values)).toEqual([{ n: 2 }, { n: 3 }])
  })

  it("syncOutbox stops on an AuthenticationError, leaving the queue untouched", async () => {
    const storage = fakeStorage()
    enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    const send = async () => {
      throw Object.assign(new Error("x"), { name: "AuthenticationError" })
    }

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 0, authRequired: true, blocked: false })
    expect(readOutbox(storage, 1)).toHaveLength(2)
  })

  it("syncOutbox marks a rejected entry with lastError, keeps going, and never retries it", async () => {
    const storage = fakeStorage()
    const a = enqueueDream(storage, 1, { n: 1 })
    enqueueDream(storage, 1, { n: 2 })
    enqueueDream(storage, 1, { n: 3 })
    const send = vi.fn(async (values: Record<string, unknown>) => {
      if (values.n === 1) throw new Error("nope")
      return { ok: true }
    })

    const result = await syncOutbox(storage, 1, send)

    expect(result).toEqual({ synced: 2, authRequired: false, blocked: false })
    const remaining = readOutbox(storage, 1)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.clientId).toBe(a.clientId)
    expect(remaining[0]!.lastError).toBe("Error: nope")

    const second = await syncOutbox(storage, 1, send)

    expect(second).toEqual({ synced: 0, authRequired: false, blocked: false })
    expect(send).toHaveBeenCalledTimes(3)
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
