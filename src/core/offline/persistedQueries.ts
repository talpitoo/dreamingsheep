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
// snapshot unless a newer live entry with the same key replaces it, or the cap
// below drops it.

export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getUser",
  "getDreams",
  "getDreamsByMonth",
  "getSymbols",
  "getAutocompleteSymbols", // the dream form's symbol picker query
] as const

// Upper bound on the stored snapshot, so a long session touching many query
// variations (search/pagination params) can't grow the payload unbounded.
export const MAX_PERSISTED_QUERIES = 50

const ALLOWLIST: readonly string[] = PERSISTED_QUERY_KEYS

interface PersistedEntry {
  queryKey: readonly unknown[]
  data: unknown
  dataUpdatedAt: number
}

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

function parseStoredEntries(raw: string): PersistedEntry[] {
  try {
    const parsed = superjson.parse<unknown>(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidEntry) : []
  } catch {
    return []
  }
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

  const live: PersistedEntry[] = qc
    .getQueryCache()
    .getAll()
    .filter(
      (query) =>
        isAllowlisted(query.queryKey) &&
        query.state.data !== undefined &&
        query.state.dataUpdatedAt > 0
    )
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }))

  const merged = new Map<string, PersistedEntry>()
  for (const entry of previous) merged.set(serializeQueryKey(entry.queryKey), entry)
  for (const entry of live) merged.set(serializeQueryKey(entry.queryKey), entry) // live wins

  const capped = [...merged.values()]
    .sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt)
    .slice(0, MAX_PERSISTED_QUERIES)

  try {
    if (capped.length === 0) storage.removeItem(key)
    else storage.setItem(key, superjson.stringify(capped))
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
    // Only a query's data actually changing (a fetch resolving, or a manual
    // setQueryData) is worth a write. The cache also fires for things like an
    // observer mounting/re-rendering or an invalidate with no new data yet —
    // reacting to those would stringify and write to storage on a timer for
    // every render of every rpc useQuery, for no stored change at all.
    if (event.type !== "updated") return
    if (event.action.type !== "success") return
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
