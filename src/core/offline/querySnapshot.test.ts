import { describe, expect, it } from "vitest"
import superjson from "superjson"
import {
  decodeSnapshot,
  encodeSnapshot,
  MAX_PERSISTED_QUERIES,
  PERSIST_ENTRY_MAX_CHARS,
  selectForStorage,
  serializeQueryKey,
} from "src/core/offline/querySnapshot"
import type { PersistedQueryEntry } from "src/core/offline/querySnapshot"

const ALLOW_ALL = () => true

// A fixed, non-random permutation: distinct small indices hash to well-spread,
// non-monotonic keys, so seeding fixtures in "shuffled" order never depends on
// Math.random (no flakiness) and never coincides with insertion order.
function deterministicShuffle<T>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, sortKey: (index * 2654435761) % 2147483647 }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ item }) => item)
}

describe("querySnapshot", () => {
  describe("decodeSnapshot", () => {
    it("returns [] for null", () => {
      expect(decodeSnapshot(null, ALLOW_ALL)).toEqual([])
    })

    it("returns [] for a corrupt, unparseable payload", () => {
      expect(decodeSnapshot("{oops", ALLOW_ALL)).toEqual([])
    })

    it("validates every entry before applying any: a malformed envelope is dropped, a valid one after it still decodes, and it never throws", () => {
      const valid: PersistedQueryEntry = {
        queryKey: ["getDreams", "p"],
        data: { dreams: [] },
        dataUpdatedAt: 1,
      }
      // The malformed envelope goes FIRST: an implementation that walks entries
      // in order and aborts (rather than isolates) at the first bad one would
      // stop before ever reaching the valid entry that follows.
      const raw = `[null,${JSON.stringify(superjson.serialize(valid as never))}]`

      expect(() => decodeSnapshot(raw, ALLOW_ALL)).not.toThrow()
      expect(decodeSnapshot(raw, ALLOW_ALL)).toEqual([valid])
    })

    it("filters decoded entries through the injected isAllowlisted predicate", () => {
      const allowed: PersistedQueryEntry = {
        queryKey: ["getDreams", "p"],
        data: { n: 1 },
        dataUpdatedAt: 1,
      }
      const notAllowed: PersistedQueryEntry = {
        queryKey: ["notAllowlisted", "x"],
        data: 1,
        dataUpdatedAt: 1,
      }
      const raw = `[${JSON.stringify(superjson.serialize(allowed as never))},${JSON.stringify(
        superjson.serialize(notAllowed as never)
      )}]`
      const isAllowlisted = (queryKey: readonly unknown[]) => queryKey[0] === "getDreams"

      expect(decodeSnapshot(raw, isAllowlisted)).toEqual([allowed])
    })
  })

  describe("encodeSnapshot", () => {
    it("returns null for an empty list, so persistQueries can removeItem instead of writing '[]'", () => {
      expect(encodeSnapshot([])).toBeNull()
    })
  })

  it("selectForStorage + encodeSnapshot + decodeSnapshot round-trips data, dataUpdatedAt, and Date values", () => {
    const dreamAt = new Date("2020-01-01T00:00:00.000Z")
    const entry: PersistedQueryEntry = {
      queryKey: ["getDreams", "p"],
      data: { dreams: [{ dreamAt }] },
      dataUpdatedAt: 12345,
    }

    const decoded = decodeSnapshot(
      encodeSnapshot(selectForStorage([], [entry], new Set())),
      ALLOW_ALL
    )

    expect(decoded).toHaveLength(1)
    expect(decoded[0]!.dataUpdatedAt).toBe(12345)
    const data = decoded[0]!.data as { dreams: { dreamAt: Date }[] }
    expect(data.dreams[0]!.dreamAt).toBeInstanceOf(Date)
    expect(data.dreams[0]!.dreamAt.getTime()).toBe(dreamAt.getTime())
  })

  it("selectForStorage keeps a previous entry that live doesn't have at all", () => {
    const stale: PersistedQueryEntry = {
      queryKey: ["getSymbols", "p"],
      data: { symbols: ["a"] },
      dataUpdatedAt: 1,
    }
    const liveOnly: PersistedQueryEntry = {
      queryKey: ["getDreams", "p"],
      data: { dreams: [] },
      dataUpdatedAt: 2,
    }

    const decoded = decodeSnapshot(
      encodeSnapshot(selectForStorage([stale], [liveOnly], new Set())),
      ALLOW_ALL
    )

    expect(decoded).toContainEqual(stale)
    expect(decoded).toContainEqual(liveOnly)
  })

  it("selectForStorage keeps whichever of previous/live is newer for the same key, not whichever side it came from", () => {
    const key = ["getDreams", "p"]
    const prevNewer: PersistedQueryEntry = { queryKey: key, data: { v: "prev" }, dataUpdatedAt: 10 }
    const liveOlder: PersistedQueryEntry = { queryKey: key, data: { v: "live" }, dataUpdatedAt: 5 }
    const decodedA = decodeSnapshot(
      encodeSnapshot(selectForStorage([prevNewer], [liveOlder], new Set())),
      ALLOW_ALL
    )
    expect(decodedA[0]!.data).toEqual({ v: "prev" }) // previous is newer: live must not clobber it

    const prevOlder: PersistedQueryEntry = { queryKey: key, data: { v: "prev" }, dataUpdatedAt: 5 }
    const liveNewer: PersistedQueryEntry = { queryKey: key, data: { v: "live" }, dataUpdatedAt: 10 }
    const decodedB = decodeSnapshot(
      encodeSnapshot(selectForStorage([prevOlder], [liveNewer], new Set())),
      ALLOW_ALL
    )
    expect(decodedB[0]!.data).toEqual({ v: "live" }) // live is newer: it replaces the stale previous copy
  })

  it("selectForStorage drops an entry from both previous and live when its key is in droppedKeys", () => {
    const key = ["getDreams", "p"]
    const inPrevious: PersistedQueryEntry = { queryKey: key, data: { v: 1 }, dataUpdatedAt: 1 }
    const inLive: PersistedQueryEntry = { queryKey: key, data: { v: 2 }, dataUpdatedAt: 2 }
    const droppedKeys = new Set([serializeQueryKey(key)])

    expect(selectForStorage([inPrevious], [inLive], droppedKeys)).toEqual([])
  })

  it("selectForStorage caps at MAX_PERSISTED_QUERIES, keeping the newest by dataUpdatedAt regardless of input order", () => {
    const entries: PersistedQueryEntry[] = Array.from(
      { length: MAX_PERSISTED_QUERIES + 5 },
      (_, i) => ({
        queryKey: ["getDreams", `p${i}`],
        data: { n: i },
        dataUpdatedAt: i, // p0 oldest ... newest last
      })
    )
    // Seeded out of order: a "keep whatever was inserted/positioned last"
    // implementation would keep the wrong 50 unless it actually sorts.
    const decoded = decodeSnapshot(
      encodeSnapshot(selectForStorage([], deterministicShuffle(entries), new Set())),
      ALLOW_ALL
    )
    const keys = decoded.map((entry) => entry.queryKey[1])

    expect(keys).not.toContain("p0") // oldest, evicted
    expect(keys).not.toContain("p4") // also evicted (5 over cap)
    expect(keys).toContain("p5") // first kept
    expect(keys).toContain(`p${MAX_PERSISTED_QUERIES + 4}`) // newest
    expect(decoded).toHaveLength(MAX_PERSISTED_QUERIES)
  })

  it("selectForStorage skips a single entry over PERSIST_ENTRY_MAX_CHARS, keeping smaller ones", () => {
    const huge: PersistedQueryEntry = {
      queryKey: ["getDreams", "huge"],
      data: { blob: "x".repeat(PERSIST_ENTRY_MAX_CHARS + 1_000) },
      dataUpdatedAt: 2,
    }
    const small: PersistedQueryEntry = {
      queryKey: ["getDreams", "small"],
      data: { blob: "ok" },
      dataUpdatedAt: 1,
    }

    const decoded = decodeSnapshot(
      encodeSnapshot(selectForStorage([], [huge, small], new Set())),
      ALLOW_ALL
    )

    expect(decoded.map((entry) => entry.queryKey[1])).toEqual(["small"])
  })

  it("selectForStorage continues past an over-budget entry instead of stopping, keeping a smaller older one that still fits", () => {
    const bigBlob = "x".repeat(250_000) // under PERSIST_ENTRY_MAX_CHARS individually
    const bigEntries: PersistedQueryEntry[] = Array.from({ length: 6 }, (_, i) => ({
      queryKey: ["getDreams", `big${i}`],
      data: { blob: bigBlob },
      dataUpdatedAt: 100 - i, // big0 newest ... big5 oldest of the six
    }))
    const tiny: PersistedQueryEntry = {
      queryKey: ["getDreams", "tiny"],
      data: { blob: "small" },
      dataUpdatedAt: 1,
    }

    const decoded = decodeSnapshot(
      encodeSnapshot(selectForStorage([], [...bigEntries, tiny], new Set())),
      ALLOW_ALL
    )
    const keys = decoded.map((entry) => entry.queryKey[1])

    expect(keys).not.toContain("big5") // doesn't fit after big0-4
    expect(keys).toContain("tiny") // still fits after big5 is skipped, not stopped on
  })

  it("selectForStorage keeps a priority key's entry ahead of a recency burst that would otherwise evict it via the slot cap", () => {
    const oldIdentity: PersistedQueryEntry = {
      queryKey: ["getCurrentUser", "null"],
      data: { id: 1 },
      dataUpdatedAt: 1,
    }
    const newerBurst: PersistedQueryEntry[] = Array.from(
      { length: MAX_PERSISTED_QUERIES + 10 },
      (_, i) => ({
        queryKey: ["getDreams", `p${i}`],
        data: { n: i },
        dataUpdatedAt: 100 + i,
      })
    )

    const withoutPriority = decodeSnapshot(
      encodeSnapshot(selectForStorage([], [oldIdentity, ...newerBurst], new Set())),
      ALLOW_ALL
    )
    const withPriority = decodeSnapshot(
      encodeSnapshot(
        selectForStorage([], [oldIdentity, ...newerBurst], new Set(), ["getCurrentUser"])
      ),
      ALLOW_ALL
    )

    expect(withoutPriority.some((entry) => entry.queryKey[0] === "getCurrentUser")).toBe(false)
    expect(withPriority.some((entry) => entry.queryKey[0] === "getCurrentUser")).toBe(true)
  })
})
