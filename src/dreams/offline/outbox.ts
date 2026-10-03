import superjson from "superjson"
import { v4 as uuidv4 } from "uuid"
import type { KeyValueStorage } from "src/core/offline/storage"

export type OutboxStorage = KeyValueStorage

export interface PendingDream {
  clientId: string // uuid
  userId: number
  values: Record<string, unknown> // CreateDream-shaped; dreamAt already an ISO string
  queuedAt: Date
  lastError?: string // set once the server permanently rejects it (4xx / ZodError / Authorization / NotFound)
  attempts?: number // counted transient failures; capped at MAX_TRANSIENT_ATTEMPTS
}

export interface SyncResult {
  synced: number
  authRequired: boolean
  blocked: boolean // network, gateway or unexhausted transient failure; retry on next trigger
}

// How many times a counted transient failure (a 5xx other than a gateway outage,
// an unclassified error) is retried before it is given up on and stamped with
// lastError like a permanent one.
export const MAX_TRANSIENT_ATTEMPTS = 10

export class OutboxWriteError extends Error {
  name = "OutboxWriteError"
}

export function outboxKey(userId: number): string {
  return `ds.outbox.${userId}`
}

export function readOutbox(storage: OutboxStorage, userId: number): PendingDream[] {
  const raw = storage.getItem(outboxKey(userId))
  if (!raw) return []
  try {
    const parsed = superjson.parse<PendingDream[]>(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeOutbox(storage: OutboxStorage, userId: number, entries: PendingDream[]): void {
  storage.setItem(outboxKey(userId), superjson.stringify(entries))
}

// Re-reads storage, patches the one matching entry, writes back, and notifies —
// the shared tail of every partial update (lastError stamp, attempts bump,
// retry-clear). Re-reading here (not just at the syncOutbox loop's top) keeps
// this safe no matter how much async work happened since the caller last read.
// What remains (every writer here, enqueue and remove included) is this one
// synchronous read→write racing the same in ANOTHER tab — accepted (PR #42
// review): the writers are a user's tap and a sync run's bookkeeping, which the
// network state keeps apart except at the instant it flips, and serialising
// them behind a cross-tab lock would make saving a dream an async step that
// waits on a running sync. Should that ever matter, one key per entry (no
// shared array) is the fix, not a lock.
function patchEntry(
  storage: OutboxStorage,
  userId: number,
  clientId: string,
  patch: Partial<PendingDream>
): void {
  writeOutbox(
    storage,
    userId,
    readOutbox(storage, userId).map((entry) =>
      entry.clientId === clientId ? { ...entry, ...patch } : entry
    )
  )
  notify()
}

// ---- change notification (mirrors src/auth/client.ts) ----------------------
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function enqueueDream(
  storage: OutboxStorage,
  userId: number,
  values: Record<string, unknown>
): PendingDream {
  if (!(userId > 0)) {
    throw new OutboxWriteError(`enqueueDream requires a positive userId, received ${userId}`)
  }
  const entry: PendingDream = { clientId: uuidv4(), userId, values, queuedAt: new Date() }
  const entries = readOutbox(storage, userId)
  entries.push(entry)
  try {
    writeOutbox(storage, userId, entries)
  } catch (error) {
    throw new OutboxWriteError(`Failed to write outbox entry: ${String(error)}`)
  }
  notify()
  return entry
}

export function removeFromOutbox(storage: OutboxStorage, userId: number, clientId: string): void {
  writeOutbox(
    storage,
    userId,
    readOutbox(storage, userId).filter((entry) => entry.clientId !== clientId)
  )
  notify()
}

export function clearOutbox(storage: OutboxStorage, userId: number): void {
  storage.removeItem(outboxKey(userId))
  notify()
}

export function retryOutboxEntry(storage: OutboxStorage, userId: number, clientId: string): void {
  patchEntry(storage, userId, clientId, { lastError: undefined, attempts: undefined })
}

export async function syncOutbox(
  storage: OutboxStorage,
  userId: number,
  send: (values: Record<string, unknown>) => Promise<unknown>
): Promise<SyncResult> {
  const clientIds = readOutbox(storage, userId).map((entry) => entry.clientId)
  let synced = 0
  for (const clientId of clientIds) {
    // Two-tab safety: re-read on every iteration, skip anything already gone.
    const entry = readOutbox(storage, userId).find((e) => e.clientId === clientId)
    if (!entry || entry.lastError) continue

    // Narrow try: only the network call itself is classified below: a storage
    // throw from the bookkeeping (removeFromOutbox/patchEntry) must propagate
    // as-is, never get reinterpreted as a server rejection.
    let threw = false
    let error: unknown
    try {
      await send(entry.values)
    } catch (caught) {
      threw = true
      error = caught
    }
    if (!threw) {
      removeFromOutbox(storage, userId, clientId)
      synced++
      continue
    }

    // Classification, in order:
    if (error instanceof TypeError) return { synced, authRequired: false, blocked: true }

    const name = error instanceof Error ? error.name : undefined
    if (name === "AuthenticationError" || name === "CSRFTokenMismatchError") {
      return { synced, authRequired: true, blocked: false }
    }

    const statusCode = (error as { statusCode?: number } | null | undefined)?.statusCode
    const permanent =
      name === "ZodError" ||
      name === "AuthorizationError" ||
      name === "NotFoundError" ||
      (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500)
    if (permanent) {
      patchEntry(storage, userId, clientId, { lastError: String(error) })
      continue
    }

    // A gateway outage (nginx's maintenance page during a deploy) is not this
    // entry's fault: wait it out, however long, without spending its attempts.
    if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
      return { synced, authRequired: false, blocked: true }
    }

    // Any other transient failure (a 5xx, an unknown name, a non-Error
    // throwable): retry a bounded number of times before giving up for good.
    const attempts = (entry.attempts ?? 0) + 1
    if (attempts >= MAX_TRANSIENT_ATTEMPTS) {
      patchEntry(storage, userId, clientId, {
        attempts,
        lastError: `gave up after ${MAX_TRANSIENT_ATTEMPTS} attempts: ${String(error)}`,
      })
      continue
    }
    patchEntry(storage, userId, clientId, { attempts })
    return { synced, authRequired: false, blocked: true }
  }
  return { synced, authRequired: false, blocked: false }
}
