import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import type { KeyValueStorage } from "./storage"
import {
  clearPersistedQueries,
  hydratePersistedQueries,
  persistedQueriesKey,
  persistQueries,
  subscribeQueryPersistence,
} from "./persistedQueries"

const USER_ID = 1

function fakeStorage(): KeyValueStorage {
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
  vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("persistedQueries", () => {
  it("persistQueries + hydratePersistedQueries round-trip restores only allowlisted keys with their dataUpdatedAt", () => {
    const storage = fakeStorage()
    const source = new QueryClient()
    source.setQueryData(["getDreams", "params"], { dreams: [], count: 0 })
    source.setQueryData(["notAllowlisted", "x"], 1)
    const dataUpdatedAt = source.getQueryState(["getDreams", "params"])!.dataUpdatedAt

    persistQueries(storage, USER_ID, source)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)

    expect(target.getQueryData(["getDreams", "params"])).toEqual({ dreams: [], count: 0 })
    expect(target.getQueryState(["getDreams", "params"])?.dataUpdatedAt).toBe(dataUpdatedAt)
    expect(target.getQueryData(["notAllowlisted", "x"])).toBeUndefined()
  })

  it("hydratePersistedQueries is a no-op when the stored payload is corrupt", () => {
    const storage = fakeStorage()
    storage.setItem(persistedQueriesKey(USER_ID), "{oops")
    const qc = new QueryClient()

    expect(() => hydratePersistedQueries(storage, USER_ID, qc)).not.toThrow()
    expect(qc.getQueryCache().getAll()).toHaveLength(0)
  })

  it("persistQueries swallows a setItem failure instead of throwing", () => {
    const storage: KeyValueStorage = {
      ...fakeStorage(),
      setItem: () => {
        throw new Error("quota exceeded")
      },
    }
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "params"], { dreams: [] })

    expect(() => persistQueries(storage, USER_ID, qc)).not.toThrow()
  })

  it("clearPersistedQueries removes the persisted key", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    persistQueries(storage, USER_ID, qc)
    expect(storage.getItem(persistedQueriesKey(USER_ID))).not.toBeNull()

    clearPersistedQueries(storage, USER_ID)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
  })

  it("hydratePersistedQueries never clobbers fresher in-memory data, but does replay a newer snapshot", () => {
    const storage = fakeStorage()
    const source = new QueryClient()
    source.setQueryData(["getDreams", "params"], { dreams: ["stale"] }) // dataUpdatedAt = 10:00:00
    persistQueries(storage, USER_ID, source)

    const target = new QueryClient()
    vi.setSystemTime(new Date("2026-09-27T10:05:00.000Z"))
    target.setQueryData(["getDreams", "params"], { dreams: ["fresh"] }) // newer than the snapshot

    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "params"])).toEqual({ dreams: ["fresh"] })

    // A newer snapshot than the target's current data DOES get replayed.
    vi.setSystemTime(new Date("2026-09-27T10:10:00.000Z"))
    source.setQueryData(["getDreams", "params"], { dreams: ["newest"] })
    persistQueries(storage, USER_ID, source)

    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "params"])).toEqual({ dreams: ["newest"] })
  })

  it("subscribeQueryPersistence persists after a debounced cache write, and stops after unsubscribe", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull() // debounced, not yet written

    vi.advanceTimersByTime(1100)

    const persisted = superjson.parse<{ queryKey: unknown[] }[]>(
      storage.getItem(persistedQueriesKey(USER_ID))!
    )
    expect(persisted).toHaveLength(1)
    expect(persisted[0]!.queryKey).toEqual(["getDreams", "params"])

    unsubscribe()
    qc.setQueryData(["getDreams", "otherParams"], { dreams: [] })
    vi.advanceTimersByTime(1100)

    const afterUnsubscribe = superjson.parse<{ queryKey: unknown[] }[]>(
      storage.getItem(persistedQueriesKey(USER_ID))!
    )
    expect(afterUnsubscribe).toHaveLength(1) // the post-unsubscribe write never made it in
  })
})
