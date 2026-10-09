import superjson from "superjson"

// Pure selection policy + wire codec for the persisted-queries feature, decoupled
// from react-query so it can be unit-tested with plain arrays. persistedQueries.ts
// supplies the react-query glue and the domain-specific allowlist/priority query
// names; everything here only knows about entries shaped
// { queryKey, data, dataUpdatedAt }.

export interface PersistedQueryEntry {
  queryKey: readonly unknown[]
  data: unknown
  dataUpdatedAt: number
}

// Upper bound on the number of stored entries, so a long session touching many
// query variations (search/pagination params) can't grow the payload unbounded.
export const MAX_PERSISTED_QUERIES = 50

// Hard ceiling on the combined stored payload's size in characters. Some queries
// (e.g. a full dream journal — no default `take`, full rows with symbols) can each
// hold most of a long journal; the same storage quota is also what the dream
// outbox needs for queued writes, so the snapshot must never be allowed to grow
// unbounded — once it stops fitting, every setItem would throw, get swallowed, and
// freeze the snapshot in place until logout.
export const PERSIST_BUDGET_CHARS = 1_500_000
// A single entry above this size never fits regardless of budget (a whole-journal
// stats query, for instance) and is worthless offline anyway.
export const PERSIST_ENTRY_MAX_CHARS = 256_000

function isValidEntry(
  value: unknown,
  isAllowlisted: (queryKey: readonly unknown[]) => boolean
): value is PersistedQueryEntry {
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

// Identifies an entry across the previous snapshot and the live cache so one
// replaces the other instead of both ending up stored side by side.
export function serializeQueryKey(queryKey: readonly unknown[]): string {
  return superjson.stringify(queryKey)
}

// The stored payload is a plain JSON array of superjson's own per-value envelopes,
// one per entry — a different wire format from a single superjson document
// wrapping the whole array, chosen so selectForStorage's budget walk can measure
// (and reuse) each entry's own serialized size instead of re-serializing
// everything a second time to build the final string. Each envelope is decoded
// independently here so one malformed entry can never abort the rest, and a raw
// JSON.parse failure (or a non-array payload) is treated the same as "nothing
// stored" rather than thrown.
export function decodeSnapshot(
  raw: string | null,
  isAllowlisted: (queryKey: readonly unknown[]) => boolean
): PersistedQueryEntry[] {
  if (!raw) return []
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
    .filter((value): value is PersistedQueryEntry => isValidEntry(value, isAllowlisted))
}

// Merges `live` onto `previous` (same-key entries: whichever has the newer
// dataUpdatedAt wins — never "live always wins", since all tabs share one storage
// key and a backgrounded tab's stale in-memory copy must not clobber a fresher one
// another tab already wrote), orders `priorityKeys` first (small identity/symbol-list
// entries a page needs on every load) with everything else newest-first, then walks
// that order keeping entries under the limits above. An entry over
// PERSIST_ENTRY_MAX_CHARS is skipped outright; once the running total would exceed
// PERSIST_BUDGET_CHARS a later, smaller entry can still fit in what's left, so that
// check skips rather than stops the walk — only the absolute MAX_PERSISTED_QUERIES
// slot count is a hard stop, since no later entry can ever claim a slot that
// doesn't exist. Returns each kept entry's own already-measured serialized string,
// so the caller (encodeSnapshot) never re-serializes them.
export function selectForStorage(
  previous: PersistedQueryEntry[],
  live: PersistedQueryEntry[],
  priorityKeys?: readonly string[]
): string[] {
  const merged = new Map<string, PersistedQueryEntry>()
  for (const entry of previous) merged.set(serializeQueryKey(entry.queryKey), entry)
  for (const entry of live) {
    const mapKey = serializeQueryKey(entry.queryKey)
    const existing = merged.get(mapKey)
    if (!existing || entry.dataUpdatedAt >= existing.dataUpdatedAt) merged.set(mapKey, entry)
  }

  const sorted = [...merged.values()].sort((a, b) => b.dataUpdatedAt - a.dataUpdatedAt)

  const isPriority = (entry: PersistedQueryEntry): boolean =>
    !!priorityKeys &&
    typeof entry.queryKey[0] === "string" &&
    priorityKeys.includes(entry.queryKey[0])
  const ordered = priorityKeys
    ? [...sorted.filter(isPriority), ...sorted.filter((entry) => !isPriority(entry))]
    : sorted

  const kept: string[] = []
  let totalChars = 0
  for (const entry of ordered) {
    if (kept.length >= MAX_PERSISTED_QUERIES) break // an absolute slot count: no later entry, of any size, can claim a slot that doesn't exist
    const serialized = JSON.stringify(superjson.serialize(entry as never))
    if (serialized.length > PERSIST_ENTRY_MAX_CHARS) continue // never fits alone; try the next one
    if (totalChars + serialized.length > PERSIST_BUDGET_CHARS) continue // doesn't fit in what's left; a smaller later entry still might
    kept.push(serialized)
    totalChars += serialized.length
  }

  return kept
}

// Reuses the measured strings selectForStorage already produced, without
// serializing that data a second time: joined, they are the JSON array of
// per-entry superjson envelopes decodeSnapshot reads — not one superjson document
// for the whole array.
export function encodeSnapshot(serializedEntries: string[]): string | null {
  return serializedEntries.length === 0 ? null : `[${serializedEntries.join(",")}]`
}
