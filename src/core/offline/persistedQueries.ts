import type { QueryClient } from "@tanstack/react-query"
import {
  decodeSnapshot,
  encodeSnapshot,
  MAX_PERSISTED_QUERIES,
  PERSIST_BUDGET_CHARS,
  PERSIST_ENTRY_MAX_CHARS,
  selectForStorage,
} from "src/core/offline/querySnapshot"
import type { PersistedQueryEntry } from "src/core/offline/querySnapshot"
import type { KeyValueStorage } from "src/core/offline/storage"

export { MAX_PERSISTED_QUERIES, PERSIST_BUDGET_CHARS, PERSIST_ENTRY_MAX_CHARS }

// Bridges react-query's QueryCache to the pure snapshot policy in querySnapshot.ts:
// this file supplies the domain allowlist/priority query names and does the
// actual storage reads/writes. On boot, hydratePersistedQueries replays the last
// snapshot into the QueryClient so a page renders last-known data immediately
// instead of what an offline query with no cached data actually does: with
// networkMode "online" and no connection, fetchStatus becomes "paused" without a
// fetch ever starting, so suspense never triggers — the query renders right away
// with data: undefined, and a component that destructures the result crashes.

// not a stub name: the explicit queryKey the symbol pickers (the dream form's, the symbols
// page's jump box) pass instead of getAutocompleteSymbols' own key, and the one
// CreateInstantSymbolDialog refetches after a create
export const AUTOCOMPLETE_SYMBOLS_QUERY_KEY = "get-symbols-autocomplete"

// never getUser: that query returns the full user row, hashedPassword included — nothing that
// may sit in localStorage. getCurrentUser is the limited profile the pages read.
export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getDreams",
  "getDreamsByMonth",
  "getSleepingTime",
  "getSymbols",
  AUTOCOMPLETE_SYMBOLS_QUERY_KEY,
] as const

// Kept ahead of the recency walk (selectForStorage's priorityKeys): small
// identity/symbol-list entries a page needs on every load, as opposed to
// getDreams/getDreamsByMonth, which can each be most of the journal.
const PRIORITY_QUERY_KEYS: readonly string[] = [
  "getCurrentUser",
  "getSleepingTime",
  "getSymbols",
  AUTOCOMPLETE_SYMBOLS_QUERY_KEY,
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
  // the read is covered too: this runs from the debounced timer below, where a storage throw
  // would surface as an uncaught exception — and a write without `previous` would drop every
  // entry the cache no longer holds, so there is nothing sensible to write then
  let previous: PersistedQueryEntry[]
  try {
    previous = decodeSnapshot(storage.getItem(key), isAllowlisted)
  } catch {
    return
  }

  const cacheQueries = qc
    .getQueryCache()
    .getAll()
    .filter((query) => isAllowlisted(query.queryKey))

  // An invalidated query is persisted like any other: invalidateQuery marks every
  // day/month variant after each online create and each sync but refetches only
  // the active one, so leaving invalidated entries out would erase exactly the
  // days an offline visit can still show. React-query keeps that data too, as stale.
  const live: PersistedQueryEntry[] = cacheQueries
    .filter((query) => query.state.data !== undefined && query.state.dataUpdatedAt > 0)
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }))

  const encoded = encodeSnapshot(selectForStorage(previous, live, PRIORITY_QUERY_KEYS))

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

// `shouldWrite` is asked when the debounced write fires, not when it is scheduled:
// the session can end in between (another tab's logout purges this user's
// snapshot while this tab has yet to notice), and a write then would re-create it.
export function subscribeQueryPersistence(
  storage: KeyValueStorage,
  userId: number,
  qc: QueryClient,
  shouldWrite?: () => boolean
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
      if (shouldWrite && !shouldWrite()) return
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
