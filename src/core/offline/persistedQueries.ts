import type { QueryClient } from "@tanstack/react-query"
import superjson from "superjson"
import type { KeyValueStorage } from "src/core/offline/storage"

// Snapshots an allowlist of react-query cache entries to storage and rehydrates
// them on boot, so a page reload while offline renders last-known data instantly
// instead of hanging on suspense forever. Pure: storage and the QueryClient are
// both injected, so this never touches window/localStorage itself.
//
// persistQueries MERGES onto the previously stored snapshot instead of mirroring
// the live cache 1:1: a query can disappear from the cache (garbage-collected once
// nothing observes it any more, evicted, etc.) without its offline value having
// gone stale, so an entry missing from the live cache is kept from the last
// snapshot unless a same-key live entry is at least as new (all tabs share the
// same storage key, so a backgrounded tab's older in-memory copy must not
// clobber a fresher one another tab already wrote), or the cap/budget below
// drops it. An invalidated query is dropped from both the live capture and any
// old snapshot copy: invalidateQuery marks every matching query invalidated but
// only refetches the active ones, so an invalidated copy is exactly the
// "possibly stale or deleted" data offline reads must not resurrect.

export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getUser",
  "getDreams",
  "getDreamsByMonth",
  "getSymbols",
  "getAutocompleteSymbols", // the dream form's symbol picker query
] as const

// Upper bound on the number of stored entries, so a long session touching many
// query variations (search/pagination params) can't grow the payload unbounded.
export const MAX_PERSISTED_QUERIES = 50

// Hard ceiling on the combined stored payload's size in characters. Some of the
// allowlisted queries (getDreams/getDreamsByMonth, no default `take`, full rows
// with symbols) can each hold most of a long journal; the same storage quota is
// also what the dream outbox needs for queued writes, so the snapshot must never
// be allowed to grow unbounded — once it stops fitting, every setItem would throw,
// get swallowed, and freeze the snapshot in place until logout.
export const PERSIST_BUDGET_CHARS = 1_500_000
// A single entry above this size never fits regardless of budget (a whole-journal
// stats query, for instance) and is worthless offline anyway; the dreams page's
// day/month/user/symbol-list entries always stay well under it.
export const PERSIST_ENTRY_MAX_CHARS = 256_000

const ALLOWLIST: readonly string[] = PERSISTED_QUERY_KEYS

interface PersistedEntry {
  queryKey: readonly unknown[]
  data: unknown
  dataUpdatedAt: number
}

// The exact shape superjson itself serializes a value into, reused below so the
// budget walk's per-entry work doubles as the stored payload instead of being
// redone: superjson.stringify(x) is defined as JSON.stringify(superjson.serialize(x)),
// so serializing each entry once up front and JSON.stringify-ing the *array* of
// those results at the end is equivalent to superjson.stringify-ing the whole
// array, without walking a whole journal's worth of data a second time.
type SerializedEntry = ReturnType<typeof superjson.serialize>

export function persistedQueriesKey(userId: number): string {
  return `ds.queries.${userId}`
}

function isAllowlisted(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && ALLOWLIST.includes(queryKey[0])
}

// Shared by the read side (hydrate) and the merge base (persist): both only
// trust entries shaped exactly like what we write, so a future release
// retiring an allowlist key — or any other drift in the stored shape — quietly
// drops that one entry instead of the whole snapshot, and a single malformed
// entry can never abort applying the rest.
function isValidEntry(value: unknown): value is PersistedEntry {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    Array.isArray(candidate.queryKey) &&
    isAllowlisted(candidate.queryKey) &&
    typeof candidate.dataUpdatedAt === "number" &&
    Number.isFinite(candidate.dataUpdatedAt) &&
    candidate.data !== undefined
  )
}

// The stored payload is a plain JSON array of superjson's own per-value
// envelopes, one per entry, rather than one superjson document wrapping the
// whole array — see SerializedEntry above for why. Each envelope is decoded
// independently so one malformed entry can never abort the rest, and a raw
// JSON.parse failure (or a non-array payload) is treated the same as "nothing
// stored" rather than thrown.
function parseStoredEntries(raw: string): PersistedEntry[] {
  let envelopes: unknown
  try {
    envelopes = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(envelopes)) return []
  return envelopes
    .map((envelope) => {
      try {
        return superjson.deserialize(envelope as never)
      } catch {
        return undefined
      }
    })
    .filter(isValidEntry)
}

// Identifies an entry across the old snapshot and the live cache so one
// replaces the other instead of both ending up stored side by side.
function serializeQueryKey(queryKey: readonly unknown[]): string {
  return superjson.stringify(queryKey)
}

export function persistQueries(storage: KeyValueStorage, userId: number, qc: QueryClient): void {
  const key = persistedQueriesKey(userId)
  const raw = storage.getItem(key)
  const previous = raw ? parseStoredEntries(raw) : []

  const cacheQueries = qc
    .getQueryCache()
    .getAll()
    .filter((query) => isAllowlisted(query.queryKey))

  const invalidatedKeys = new Set(
    cacheQueries
      .filter((query) => query.state.isInvalidated)
      .map((query) => serializeQueryKey(query.queryKey))
  )

  const live: PersistedEntry[] = cacheQueries
    .filter(
      (query) =>
        !query.state.isInvalidated &&
        query.state.data !== undefined &&
        query.state.dataUpdatedAt > 0
    )
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }))

  const merged = new Map<string, PersistedEntry>()
  for (const entry of previous) {
    const mapKey = serializeQueryKey(entry.queryKey)
    if (!invalidatedKeys.has(mapKey)) merged.set(mapKey, entry)
  }
  for (const entry of live) {
    const mapKey = serializeQueryKey(entry.queryKey)
    const existing = merged.get(mapKey)
    if (!existing || entry.dataUpdatedAt >= existing.dataUpdatedAt) merged.set(mapKey, entry)
  }

  const sorted = [...merged.values()].sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt)

  const kept: SerializedEntry[] = []
  let totalChars = 0
  for (const entry of sorted) {
    if (kept.length >= MAX_PERSISTED_QUERIES) break
    const envelope = superjson.serialize(entry as never)
    const size = JSON.stringify(envelope).length
    if (size > PERSIST_ENTRY_MAX_CHARS) continue // never fits alone; try the next (older) one
    if (totalChars + size > PERSIST_BUDGET_CHARS) break // everything left is older still — stop here
    kept.push(envelope)
    totalChars += size
  }

  try {
    if (kept.length === 0) storage.removeItem(key)
    else storage.setItem(key, JSON.stringify(kept))
  } catch {
    // Quota exceeded / private mode: offline reads simply miss this snapshot.
  }
}

export function hydratePersistedQueries(
  storage: KeyValueStorage,
  userId: number,
  qc: QueryClient
): void {
  const raw = storage.getItem(persistedQueriesKey(userId))
  if (!raw) return

  for (const entry of parseStoredEntries(raw)) {
    // Never clobber fresher in-memory data: only replay when the cache has no
    // data for this key yet, or the snapshot is newer than what's already there.
    const cached = qc.getQueryState(entry.queryKey)
    const cacheIsFresherOrEqual =
      cached?.data !== undefined && entry.dataUpdatedAt <= cached.dataUpdatedAt
    if (cacheIsFresherOrEqual) continue
    qc.setQueryData(entry.queryKey, entry.data, { updatedAt: entry.dataUpdatedAt })
  }
}

export function subscribeQueryPersistence(
  storage: KeyValueStorage,
  userId: number,
  qc: QueryClient
): () => void {
  let handle: ReturnType<typeof setTimeout> | undefined

  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    // Only a data-changing success for a query we actually persist is worth a
    // write. The cache also fires for things like an observer mounting/
    // re-rendering, an invalidate with no new data yet, or a fetch success on a
    // query outside the allowlist (getDream, getSleepingTimes, …) — reacting to
    // any of those would read, merge and rewrite the whole snapshot on a timer
    // for no stored change at all.
    if (event.type !== "updated") return
    if (event.action.type !== "success") return
    if (!isAllowlisted(event.query.queryKey)) return
    if (handle) clearTimeout(handle)
    handle = setTimeout(() => {
      handle = undefined
      persistQueries(storage, userId, qc)
    }, 1000)
  })

  return () => {
    unsubscribe()
    if (handle) clearTimeout(handle)
  }
}

export function clearPersistedQueries(storage: KeyValueStorage, userId: number): void {
  storage.removeItem(persistedQueriesKey(userId))
}
