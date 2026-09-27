import { QueryClient } from "@tanstack/react-query"
import superjson from "superjson"
import type { KeyValueStorage } from "./storage"

// Snapshots an allowlist of successful react-query cache entries to storage and
// rehydrates them on boot, so a page reload while offline renders last-known
// data instantly instead of hanging on suspense forever. Pure: storage and the
// QueryClient are both injected, so this never touches window/localStorage itself.

export const PERSISTED_QUERY_KEYS = [
  "getCurrentUser",
  "getUser",
  "getDreams",
  "getDreamsByMonth",
  "getSymbols",
  "getAutocompleteSymbols", // the dream form's symbol picker query
] as const

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

export function persistQueries(storage: KeyValueStorage, userId: number, qc: QueryClient): void {
  const entries: PersistedEntry[] = qc
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.status === "success" && isAllowlisted(query.queryKey))
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }))
  try {
    storage.setItem(persistedQueriesKey(userId), superjson.stringify(entries))
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

  let entries: PersistedEntry[]
  try {
    const parsed = superjson.parse<PersistedEntry[]>(raw)
    entries = Array.isArray(parsed) ? parsed : []
  } catch {
    return
  }

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

  const unsubscribe = qc.getQueryCache().subscribe(() => {
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
