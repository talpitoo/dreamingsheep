import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import type { KeyValueStorage } from "src/core/offline/storage"
import {
  clearPersistedQueries,
  hydratePersistedQueries,
  MAX_PERSISTED_QUERIES,
  PERSIST_BUDGET_CHARS,
  PERSIST_ENTRY_MAX_CHARS,
  persistedQueriesKey,
  persistQueries,
  subscribeQueryPersistence,
} from "src/core/offline/persistedQueries"

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

// Mirrors persistedQueries.ts's own wire format: a plain JSON array of
// superjson's per-value envelopes, one per entry (see that file's comment on
// SerializedEntry for why). Kept in one place so a future format change only
// needs updating here, not at every seeding/reading call site below.
function encodeEntries(entries: unknown[]): string {
  return JSON.stringify(entries.map((entry) => superjson.serialize(entry as never)))
}

function decodeEntries(raw: string): { queryKey: unknown[] }[] {
  return (JSON.parse(raw) as unknown[]).map((envelope) => superjson.deserialize(envelope as never))
}

// A fixed, non-random permutation: distinct small indices hash to well-spread,
// non-monotonic keys, so seeding fixtures in "shuffled" order never depends on
// Math.random (no flakiness) and never coincides with insertion order.
function deterministicShuffle<T>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, sortKey: (index * 2654435761) % 2147483647 }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ item }) => item)
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

    // Move the clock away from dataUpdatedAt before hydrating: setQueryData without
    // an explicit updatedAt stamps the current time, so if the implementation ever
    // dropped that option, this would restore "now" instead of the original moment
    // and the assertion below would catch it.
    vi.setSystemTime(new Date("2026-09-27T11:00:00.000Z"))

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)

    expect(target.getQueryData(["getDreams", "params"])).toEqual({ dreams: [], count: 0 })
    expect(target.getQueryState(["getDreams", "params"])?.dataUpdatedAt).toBe(dataUpdatedAt)
    expect(target.getQueryData(["notAllowlisted", "x"])).toBeUndefined()
  })

  it("preserves Date values inside persisted data through the envelope-per-entry storage format", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const dreamAt = new Date("2020-01-01T00:00:00.000Z")
    qc.setQueryData(["getDreams", "params"], { dreams: [{ dreamAt }] })

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    const restored = target.getQueryData(["getDreams", "params"]) as { dreams: { dreamAt: Date }[] }
    expect(restored.dreams[0]!.dreamAt).toBeInstanceOf(Date)
    expect(restored.dreams[0]!.dreamAt.getTime()).toBe(dreamAt.getTime())
  })

  it("hydratePersistedQueries is a no-op when the stored payload is corrupt", () => {
    const storage = fakeStorage()
    storage.setItem(persistedQueriesKey(USER_ID), "{oops")
    const qc = new QueryClient()

    expect(() => hydratePersistedQueries(storage, USER_ID, qc)).not.toThrow()
    expect(qc.getQueryCache().getAll()).toHaveLength(0)
  })

  it("hydratePersistedQueries validates every entry before applying any: a malformed entry is dropped, the valid one still hydrates, and it never throws", () => {
    const storage = fakeStorage()
    const validEntry = {
      queryKey: ["getDreams", "params"],
      data: { dreams: [] },
      dataUpdatedAt: Date.now(),
    }
    // The malformed envelope goes FIRST: an implementation that walks entries in
    // order and aborts (rather than isolates) at the first bad one would stop
    // before ever reaching the valid entry that follows.
    storage.setItem(
      persistedQueriesKey(USER_ID),
      JSON.stringify([null, superjson.serialize(validEntry as never)])
    )
    const qc = new QueryClient()

    expect(() => hydratePersistedQueries(storage, USER_ID, qc)).not.toThrow()
    expect(qc.getQueryData(["getDreams", "params"])).toEqual({ dreams: [] })
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

  it("persistQueries keeps a previously stored entry that has since fallen out of the live cache", () => {
    const storage = fakeStorage()
    const firstClient = new QueryClient()
    firstClient.setQueryData(["getSymbols", "p"], { symbols: ["a"] })
    persistQueries(storage, USER_ID, firstClient)

    // A later persist from a client whose cache no longer has that query at all
    // (e.g. it was garbage-collected once nothing observed it any more).
    const laterClient = new QueryClient()
    laterClient.setQueryData(["getDreams", "p"], { dreams: [] })
    persistQueries(storage, USER_ID, laterClient)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getSymbols", "p"])).toEqual({ symbols: ["a"] }) // survived
    expect(target.getQueryData(["getDreams", "p"])).toEqual({ dreams: [] }) // newly captured
  })

  it("persistQueries keeps the newer of a live entry and a previously stored one for the same key", () => {
    const storage = fakeStorage()
    const freshQc = new QueryClient()
    freshQc.setQueryData(["getDreams", "p"], { dreams: ["fresh"] }) // dataUpdatedAt = 10:00:00
    persistQueries(storage, USER_ID, freshQc)

    // A different (e.g. background) tab whose own live copy is older than what's
    // already stored must not be allowed to clobber the fresher stored copy.
    vi.setSystemTime(new Date("2026-09-27T09:00:00.000Z"))
    const staleQc = new QueryClient()
    staleQc.setQueryData(["getDreams", "p"], { dreams: ["stale"] })
    persistQueries(storage, USER_ID, staleQc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "p"])).toEqual({ dreams: ["fresh"] })
  })

  it("persistQueries neither persists an invalidated cache entry nor keeps its old snapshot copy", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "p"], { dreams: ["v1"] })
    persistQueries(storage, USER_ID, qc) // the old snapshot now holds this entry

    qc.getQueryCache().find(["getDreams", "p"])!.invalidate() // still has data, now isInvalidated
    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "p"])).toBeUndefined()
  })

  it("persistQueries keeps an error-status query that still holds data from an earlier successful fetch", async () => {
    // react-query logs a failed fetch through console.error outside production;
    // this deliberately-failing fetch is the point of the test, not a real bug.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const storage = fakeStorage()
      const qc = new QueryClient()
      await qc.fetchQuery({
        queryKey: ["getDreams", "p"],
        queryFn: () => Promise.resolve({ dreams: ["ok"] }),
        retry: false,
      })
      await expect(
        qc.fetchQuery({
          queryKey: ["getDreams", "p"],
          queryFn: () => Promise.reject(new Error("502 maintenance")),
          retry: false,
        })
      ).rejects.toThrow("502 maintenance")
      expect(qc.getQueryState(["getDreams", "p"])?.status).toBe("error")
      expect(qc.getQueryState(["getDreams", "p"])?.data).toEqual({ dreams: ["ok"] })

      persistQueries(storage, USER_ID, qc)

      const target = new QueryClient()
      hydratePersistedQueries(storage, USER_ID, target)
      expect(target.getQueryData(["getDreams", "p"])).toEqual({ dreams: ["ok"] })
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it("persistQueries caps the merged snapshot at MAX_PERSISTED_QUERIES, keeping the newest by dataUpdatedAt", () => {
    const storage = fakeStorage()
    const stale = Array.from({ length: MAX_PERSISTED_QUERIES + 5 }, (_, i) => ({
      queryKey: ["getDreams", `p${i}`],
      data: { n: i },
      dataUpdatedAt: i, // p0 oldest ... newest last
    }))
    // Seeded out of order: a "keep whatever was inserted last" implementation
    // (relying on array/Map position instead of sorting by dataUpdatedAt) would
    // keep the wrong 50 unless it actually sorts.
    storage.setItem(persistedQueriesKey(USER_ID), encodeEntries(deterministicShuffle(stale)))

    persistQueries(storage, USER_ID, new QueryClient()) // empty live cache: pure recap + cap

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "p0"])).toBeUndefined() // oldest, evicted
    expect(target.getQueryData(["getDreams", "p4"])).toBeUndefined() // also evicted (5 over cap)
    expect(target.getQueryData(["getDreams", "p5"])).toEqual({ n: 5 }) // first kept
    expect(target.getQueryData(["getDreams", `p${MAX_PERSISTED_QUERIES + 4}`])).toEqual({
      n: MAX_PERSISTED_QUERIES + 4,
    })
  })

  it("persistQueries skips a single entry larger than PERSIST_ENTRY_MAX_CHARS while still persisting smaller ones", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "huge"], { blob: "x".repeat(PERSIST_ENTRY_MAX_CHARS + 1_000) })
    qc.setQueryData(["getDreams", "small"], { blob: "ok" })

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "huge"])).toBeUndefined()
    expect(target.getQueryData(["getDreams", "small"])).toEqual({ blob: "ok" })
  })

  it("persistQueries drops entries beyond PERSIST_BUDGET_CHARS, keeping the newest that fit", () => {
    const storage = fakeStorage()
    const blob = "x".repeat(250_000) // under PERSIST_ENTRY_MAX_CHARS; several exceed the budget
    const qc = new QueryClient()
    ;["a", "b", "c", "d", "e", "f", "g"].forEach((k, i) => {
      vi.setSystemTime(new Date(2026, 8, 27, 10, 0, i)) // a oldest ... g newest
      qc.setQueryData(["getDreams", k], { blob })
    })

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "g"])).toEqual({ blob }) // newest: always kept
    expect(target.getQueryData(["getDreams", "a"])).toBeUndefined() // oldest: budget-dropped
  })

  it("persistQueries removes the storage key (not '[]') when the merged snapshot is empty", () => {
    const storage = fakeStorage()
    storage.setItem(persistedQueriesKey(USER_ID), "leftover-from-a-previous-user")
    const qc = new QueryClient()
    qc.setQueryData(["notAllowlisted", "x"], 1)

    persistQueries(storage, USER_ID, qc)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
  })

  it("subscribeQueryPersistence persists after a debounced cache write, and stops after unsubscribe", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull() // debounced, not yet written

    vi.advanceTimersByTime(1100)

    const persisted = decodeEntries(storage.getItem(persistedQueriesKey(USER_ID))!)
    expect(persisted).toHaveLength(1)
    expect(persisted[0]!.queryKey).toEqual(["getDreams", "params"])

    unsubscribe()
    qc.setQueryData(["getDreams", "otherParams"], { dreams: [] })
    vi.advanceTimersByTime(1100)

    const afterUnsubscribe = decodeEntries(storage.getItem(persistedQueriesKey(USER_ID))!)
    expect(afterUnsubscribe).toHaveLength(1) // the post-unsubscribe write never made it in
  })

  it("unsubscribing before the debounce fires cancels the pending write", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    unsubscribe()
    vi.advanceTimersByTime(1100)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
  })

  it("subscribeQueryPersistence collapses several cache events inside the debounce window into a single write", () => {
    const storage = fakeStorage()
    const setItemSpy = vi.spyOn(storage, "setItem")
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDreams", "a"], { n: 1 })
    vi.advanceTimersByTime(400)
    qc.setQueryData(["getDreams", "b"], { n: 2 })
    vi.advanceTimersByTime(400)
    qc.setQueryData(["getDreams", "c"], { n: 3 })
    vi.advanceTimersByTime(1100)

    expect(setItemSpy).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("subscribeQueryPersistence ignores cache events that are not a data-changing success", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    // A state patch that is not a 'success' action (no fetch, no setQueryData) —
    // e.g. what an observer mounting/re-rendering or an invalidate triggers.
    qc.getQueryCache().find(["getDreams", "params"])!.setState({ isInvalidated: true })
    vi.advanceTimersByTime(1100)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
    unsubscribe()
  })

  it("subscribeQueryPersistence ignores a success on a query outside the allowlist, without even reading storage", () => {
    const storage = fakeStorage()
    const getItemSpy = vi.spyOn(storage, "getItem")
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDream", "1"], { id: 1 }) // not in PERSISTED_QUERY_KEYS
    vi.advanceTimersByTime(1100)

    // Not just "storage ends up unchanged" (persistQueries's own allowlist filter
    // would already guarantee that) but "no read/merge/rewrite cycle ran at all".
    expect(getItemSpy).not.toHaveBeenCalled()
    unsubscribe()
  })
})
