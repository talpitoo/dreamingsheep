import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { KeyValueStorage } from "src/core/offline/storage"
import {
  clearPersistedQueries,
  hydratePersistedQueries,
  MAX_PERSISTED_QUERIES,
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

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

// The pure selection/codec policy (merge, drop, priority order, cap, budget,
// encode/decode validation) is unit-tested directly on plain arrays in
// querySnapshot.test.ts. These tests cover only what that file can't: the
// react-query-specific glue — reading real Query/QueryObserver state,
// debouncing off the real QueryCache, and bridging to/from a real QueryClient.
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

  it("persistQueries removes the storage key when there is nothing left to persist", () => {
    const storage = fakeStorage()
    storage.setItem(persistedQueriesKey(USER_ID), "leftover-from-a-previous-user")
    const qc = new QueryClient()
    qc.setQueryData(["notAllowlisted", "x"], 1)

    persistQueries(storage, USER_ID, qc)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
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

  it("persistQueries neither persists an INACTIVE invalidated cache entry nor keeps its old snapshot copy", () => {
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

  it("persistQueries keeps an ACTIVE invalidated query's stored copy (a refetch mid-flight or failed must not erase it)", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(["getDreams", "p"], { dreams: ["v1"] })
    persistQueries(storage, USER_ID, qc) // the old snapshot now holds this entry

    // An observer subscribed to the query is what "active" means (isActive()
    // checks for at least one enabled observer) — refetchOnMount: false keeps
    // this from triggering an actual fetch, so the test stays synchronous and
    // deterministic; only invalidate() is what flips isInvalidated.
    const observer = new QueryObserver(qc, {
      queryKey: ["getDreams", "p"],
      enabled: true,
      refetchOnMount: false,
    })
    const unsubscribeObserver = observer.subscribe(() => undefined)
    qc.getQueryCache().find(["getDreams", "p"])!.invalidate()

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "p"])).toEqual({ dreams: ["v1"] })

    unsubscribeObserver()
  })

  it("persistQueries keeps getCurrentUser ahead of a recency burst that would otherwise evict it via the slot cap", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    vi.setSystemTime(new Date(2026, 8, 27, 9, 0, 0))
    qc.setQueryData(["getCurrentUser", "null"], { id: 1 })
    for (let i = 0; i < MAX_PERSISTED_QUERIES + 10; i++) {
      vi.setSystemTime(new Date(2026, 8, 27, 10, 0, i))
      qc.setQueryData(["getDreams", `p${i}`], { n: i })
    }

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getCurrentUser", "null"])).toEqual({ id: 1 })
  })

  it("subscribeQueryPersistence persists after a debounced cache write, and stops after unsubscribe", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(["getDreams", "params"], { dreams: [] })
    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull() // debounced, not yet written

    vi.advanceTimersByTime(1100)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(["getDreams", "params"])).toEqual({ dreams: [] })

    unsubscribe()
    qc.setQueryData(["getDreams", "otherParams"], { dreams: [] })
    vi.advanceTimersByTime(1100)

    const targetAfter = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, targetAfter)
    expect(targetAfter.getQueryData(["getDreams", "otherParams"])).toBeUndefined() // never persisted
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
