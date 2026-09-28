import type { QueryClient } from "@tanstack/react-query"
import {
  decodeSnapshot,
  encodeSnapshot,
  MAX_PERSISTED_QUERIES,
  PERSIST_BUDGET_CHARS,
  PERSIST_ENTRY_MAX_CHARS,
  selectForStorage,
  serializeQueryKey,
} from "src/core/offline/querySnapshot"
import type { PersistedQueryEntry } from "src/core/offline/querySnapshot"
import type { KeyValueStorage } from "src/core/offline/storage"

export { MAX_PERSISTED_QUERIES, PERSIST_BUDGET_CHARS, PERSIST_ENTRY_MAX_CHARS }

// Bridges react-query's QueryCache to the pure snapshot policy in querySnapshot.ts:
// this file supplies the domain allowlist/priority query names and the
// react-query-specific signal querySnapshot.ts can't see for itself (which
// queries are invalidated-and-inactive), and does the actual storage reads/
// writes. On boot, hydratePersistedQueries replays the last snapshot into the
// QueryClient so a page renders last-known data immediately instead of what an
// offline query with no cached data actually does: with networkMode "online" and
// no connection, fetchStatus becomes "paused" without a fetch ever starting, so
// suspense never triggers — the query renders right away with data: undefined,
// and a component that destructures the result crashes.

export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getUser",
  "getDreams",
  "getDreamsByMonth",
  "getSymbols",
  // not a stub name: the explicit queryKey the symbol pickers (the dream form's, the symbols
  // page's jump box) pass instead of getAutocompleteSymbols' own key
  "get-symbols-autocomplete",
] as const

// Kept ahead of the recency walk (selectForStorage's priorityKeys): small
// identity/symbol-list entries a page needs on every load, as opposed to
// getDreams/getDreamsByMonth, which can each be most of the journal.
const PRIORITY_QUERY_KEYS: readonly string[] = [
  "getCurrentUser",
  "getUser",
  "getSymbols",
  "get-symbols-autocomplete",
]

const ALLOWLIST: readonly string[] = PERSISTED_QUERY_KEYS

export function persistedQueriesKey(userId: number): string {
  return `ds.queries.${userId}`
}

function isAllowlisted(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && ALLOWLIST.includes(queryKey[0])
}

export function persistQueries(storage: KeyValueStorage, userId: number, qc: QueryClient): void {
  const key = persistedQueriesKey(userId)
  const previous = decodeSnapshot(storage.getItem(key), isAllowlisted)

  const cacheQueries = qc
    .getQueryCache()
    .getAll()
    .filter((query) => isAllowlisted(query.queryKey))

  // Only an INACTIVE invalidated query is dropped: invalidateQuery marks every
  // matching query invalidated but only refetches the active ones, so an active
  // query mid-retry (or one whose refetch just failed) still carries its old,
  // pre-invalidation data — exactly the outbox-sync-then-refetch window where
  // dropping it would erase a still-good copy for no reason. isInvalidated is
  // only cleared by a success, so this stays true through the retry/failure.
  const droppedKeys = new Set(
    cacheQueries
      .filter((query) => query.state.isInvalidated && !query.isActive())
      .map((query) => serializeQueryKey(query.queryKey))
  )

  const live: PersistedQueryEntry[] = cacheQueries
    .filter((query) => query.state.data !== undefined && query.state.dataUpdatedAt > 0)
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }))

  const encoded = encodeSnapshot(selectForStorage(previous, live, droppedKeys, PRIORITY_QUERY_KEYS))

  try {
    if (encoded === null) storage.removeItem(key)
    else storage.setItem(key, encoded)
  } catch {
    // Quota exceeded / private mode: offline reads simply miss this snapshot.
  }
}

export function hydratePersistedQueries(
  storage: KeyValueStorage,
  userId: number,
  qc: QueryClient
): void {
  const entries = decodeSnapshot(storage.getItem(persistedQueriesKey(userId)), isAllowlisted)
  for (const entry of entries) {
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
