import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import type { KeyValueStorage } from "src/core/offline/storage"
import {
  clearPersistedQueries,
  forgetOtherUsersSnapshots,
  hydratePersistedQueries,
  MAX_PERSISTED_QUERIES,
  persistedQueriesKey,
  persistQueries,
  subscribeQueryPersistence,
} from "src/core/offline/persistedQueries"

const USER_ID = 1

// a getDreams key as queryKeyFor builds it: the params travel as a superjson string
const dreamsKey = (params: object) => ["getDreams", superjson.stringify(params)]

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

// The pure selection/codec policy (merge, priority order, cap, budget,
// encode/decode validation) is unit-tested directly on plain arrays in
// querySnapshot.test.ts. These tests cover only what that file can't: the
// react-query-specific glue — reading real Query/QueryObserver state,
// debouncing off the real QueryCache, and bridging to/from a real QueryClient.
// localStorage-shaped: the boot-time purge has to enumerate keys, which KeyValueStorage cannot
function fakeEnumerableStorage() {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

describe("persistedQueries", () => {
  it("persists getDreams only when it is a paginated list: the whole-journal stats/search variants stay out", () => {
    const storage = fakeStorage()
    const source = new QueryClient()
    source.setQueryData(dreamsKey({ take: 20, skip: 0 }), { dreams: ["a day"], count: 1 })
    source.setQueryData(["getDreams", { where: { dreamAt: { gte: "2026-01-01" } } }], {
      dreams: ["the whole journal"],
      count: 1,
    })

    persistQueries(storage, USER_ID, source)
    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)

    expect(target.getQueryData(dreamsKey({ take: 20, skip: 0 }))).toEqual({
      dreams: ["a day"],
      count: 1,
    })
    expect(
      target.getQueryData(["getDreams", { where: { dreamAt: { gte: "2026-01-01" } } }])
    ).toBeUndefined()
  })

  it("forgetOtherUsersSnapshots drops other users' query snapshots only — never an outbox, never unrelated keys", () => {
    const storage = fakeEnumerableStorage()
    storage.setItem(persistedQueriesKey(1), "mine")
    storage.setItem(persistedQueriesKey(2), "someone else's")
    storage.setItem(persistedQueriesKey(3), "a third person's")
    storage.setItem("ds.outbox.2", "their pending dreams")
    storage.setItem("cookieNoticeAcknowledged", "true")

    forgetOtherUsersSnapshots(storage, 1)

    expect(storage.getItem(persistedQueriesKey(1))).toBe("mine")
    expect(storage.getItem(persistedQueriesKey(2))).toBeNull()
    expect(storage.getItem(persistedQueriesKey(3))).toBeNull()
    expect(storage.getItem("ds.outbox.2")).toBe("their pending dreams")
    expect(storage.getItem("cookieNoticeAcknowledged")).toBe("true")

    // logged out at boot: every snapshot goes, the rest stays
    forgetOtherUsersSnapshots(storage, null)
    expect(storage.getItem(persistedQueriesKey(1))).toBeNull()
    expect(storage.getItem("ds.outbox.2")).toBe("their pending dreams")
    expect(storage.length).toBe(2)
  })

  it("persistQueries + hydratePersistedQueries round-trip restores only allowlisted keys with their dataUpdatedAt", () => {
    const storage = fakeStorage()
    const source = new QueryClient()
    source.setQueryData(dreamsKey({ take: 20 }), { dreams: [], count: 0 })
    source.setQueryData(["notAllowlisted", "x"], 1)
    const dataUpdatedAt = source.getQueryState(dreamsKey({ take: 20 }))!.dataUpdatedAt

    persistQueries(storage, USER_ID, source)

    // Move the clock away from dataUpdatedAt before hydrating: setQueryData without
    // an explicit updatedAt stamps the current time, so if the implementation ever
    // dropped that option, this would restore "now" instead of the original moment
    // and the assertion below would catch it.
    vi.setSystemTime(new Date("2026-09-27T11:00:00.000Z"))

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)

    expect(target.getQueryData(dreamsKey({ take: 20 }))).toEqual({ dreams: [], count: 0 })
    expect(target.getQueryState(dreamsKey({ take: 20 }))?.dataUpdatedAt).toBe(dataUpdatedAt)
    expect(target.getQueryData(["notAllowlisted", "x"])).toBeUndefined()
  })

  it("hydratePersistedQueries never clobbers fresher in-memory data, but does replay a newer snapshot", () => {
    const storage = fakeStorage()
    const source = new QueryClient()
    source.setQueryData(dreamsKey({ take: 20 }), { dreams: ["stale"] }) // dataUpdatedAt = 10:00:00
    persistQueries(storage, USER_ID, source)

    const target = new QueryClient()
    vi.setSystemTime(new Date("2026-09-27T10:05:00.000Z"))
    target.setQueryData(dreamsKey({ take: 20 }), { dreams: ["fresh"] }) // newer than the snapshot

    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(dreamsKey({ take: 20 }))).toEqual({ dreams: ["fresh"] })

    // A newer snapshot than the target's current data DOES get replayed.
    vi.setSystemTime(new Date("2026-09-27T10:10:00.000Z"))
    source.setQueryData(dreamsKey({ take: 20 }), { dreams: ["newest"] })
    persistQueries(storage, USER_ID, source)

    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(dreamsKey({ take: 20 }))).toEqual({ dreams: ["newest"] })
  })

  it("persistQueries swallows a setItem failure instead of throwing", () => {
    const storage: KeyValueStorage = {
      ...fakeStorage(),
      setItem: () => {
        throw new Error("quota exceeded")
      },
    }
    const qc = new QueryClient()
    qc.setQueryData(dreamsKey({ take: 20 }), { dreams: [] })

    expect(() => persistQueries(storage, USER_ID, qc)).not.toThrow()
  })

  it("clearPersistedQueries removes the persisted key", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(dreamsKey({ take: 20 }), { dreams: [] })
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
        queryKey: dreamsKey({ take: 20, p: 1 }),
        queryFn: () => Promise.resolve({ dreams: ["ok"] }),
        retry: false,
      })
      await expect(
        qc.fetchQuery({
          queryKey: dreamsKey({ take: 20, p: 1 }),
          queryFn: () => Promise.reject(new Error("502 maintenance")),
          retry: false,
        })
      ).rejects.toThrow("502 maintenance")
      expect(qc.getQueryState(dreamsKey({ take: 20, p: 1 }))?.status).toBe("error")
      expect(qc.getQueryState(dreamsKey({ take: 20, p: 1 }))?.data).toEqual({ dreams: ["ok"] })

      persistQueries(storage, USER_ID, qc)

      const target = new QueryClient()
      hydratePersistedQueries(storage, USER_ID, target)
      expect(target.getQueryData(dreamsKey({ take: 20, p: 1 }))).toEqual({ dreams: ["ok"] })
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  it("persistQueries keeps an INACTIVE invalidated query's data, both its snapshot copy and a first write", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(dreamsKey({ take: 20, p: 1 }), { dreams: ["v1"] })
    persistQueries(storage, USER_ID, qc) // the old snapshot now holds this entry
    qc.setQueryData(dreamsKey({ take: 20, q: 1 }), { dreams: ["never stored yet"] })

    // what invalidateQuery(getDreams) does after every online create and every sync: it marks
    // every day variant invalidated, and none of these has an observer to refetch it
    void qc.invalidateQueries({ queryKey: ["getDreams"] })
    expect(qc.getQueryState(dreamsKey({ take: 20, p: 1 }))?.isInvalidated).toBe(true)
    expect(qc.getQueryState(dreamsKey({ take: 20, q: 1 }))?.isInvalidated).toBe(true)

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(dreamsKey({ take: 20, p: 1 }))).toEqual({ dreams: ["v1"] })
    expect(target.getQueryData(dreamsKey({ take: 20, q: 1 }))).toEqual({
      dreams: ["never stored yet"],
    })
  })

  it("persistQueries keeps an ACTIVE invalidated query's stored copy (a refetch mid-flight or failed must not erase it)", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(dreamsKey({ take: 20, p: 1 }), { dreams: ["v1"] })
    persistQueries(storage, USER_ID, qc) // the old snapshot now holds this entry

    // An observer subscribed to the query is what "active" means (isActive()
    // checks for at least one enabled observer) — refetchOnMount: false keeps
    // this from triggering an actual fetch, so the test stays synchronous and
    // deterministic; only invalidate() is what flips isInvalidated.
    const observer = new QueryObserver(qc, {
      queryKey: dreamsKey({ take: 20, p: 1 }),
      enabled: true,
      refetchOnMount: false,
    })
    const unsubscribeObserver = observer.subscribe(() => undefined)
    qc.getQueryCache()
      .find(dreamsKey({ take: 20, p: 1 }))!
      .invalidate()

    persistQueries(storage, USER_ID, qc)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(dreamsKey({ take: 20, p: 1 }))).toEqual({ dreams: ["v1"] })

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

    qc.setQueryData(dreamsKey({ take: 20 }), { dreams: [] })
    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull() // debounced, not yet written

    vi.advanceTimersByTime(1100)

    const target = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, target)
    expect(target.getQueryData(dreamsKey({ take: 20 }))).toEqual({ dreams: [] })

    unsubscribe()
    qc.setQueryData(["getDreams", "otherParams"], { dreams: [] })
    vi.advanceTimersByTime(1100)

    const targetAfter = new QueryClient()
    hydratePersistedQueries(storage, USER_ID, targetAfter)
    expect(targetAfter.getQueryData(["getDreams", "otherParams"])).toBeUndefined() // never persisted
  })

  it("subscribeQueryPersistence skips the write when shouldWrite says no at the moment it fires", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    let sameSession = true
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc, () => sameSession)

    qc.setQueryData(dreamsKey({ take: 20, day: "a" }), { dreams: [] })
    sameSession = false // e.g. a logout in another tab lands inside the debounce window
    vi.advanceTimersByTime(1100)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()

    // the same subscription still writes once the predicate agrees again
    sameSession = true
    qc.setQueryData(dreamsKey({ take: 20, day: "b" }), { dreams: [] })
    vi.advanceTimersByTime(1100)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).not.toBeNull()
    unsubscribe()
  })

  it("unsubscribing before the debounce fires cancels the pending write", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(dreamsKey({ take: 20 }), { dreams: [] })
    unsubscribe()
    vi.advanceTimersByTime(1100)

    expect(storage.getItem(persistedQueriesKey(USER_ID))).toBeNull()
  })

  it("subscribeQueryPersistence collapses several cache events inside the debounce window into a single write", () => {
    const storage = fakeStorage()
    const setItemSpy = vi.spyOn(storage, "setItem")
    const qc = new QueryClient()
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    qc.setQueryData(dreamsKey({ take: 20, day: "a" }), { n: 1 })
    vi.advanceTimersByTime(400)
    qc.setQueryData(dreamsKey({ take: 20, day: "b" }), { n: 2 })
    vi.advanceTimersByTime(400)
    qc.setQueryData(dreamsKey({ take: 20, day: "c" }), { n: 3 })
    vi.advanceTimersByTime(1100)

    expect(setItemSpy).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("subscribeQueryPersistence ignores cache events that are not a data-changing success", () => {
    const storage = fakeStorage()
    const qc = new QueryClient()
    qc.setQueryData(dreamsKey({ take: 20 }), { dreams: [] })
    const unsubscribe = subscribeQueryPersistence(storage, USER_ID, qc)

    // A state patch that is not a 'success' action (no fetch, no setQueryData) —
    // e.g. what an observer mounting/re-rendering or an invalidate triggers.
    qc.getQueryCache()
      .find(dreamsKey({ take: 20 }))!
      .setState({ isInvalidated: true })
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
