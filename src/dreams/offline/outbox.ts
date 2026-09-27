import superjson from "superjson"
import { v4 as uuidv4 } from "uuid"
import type { KeyValueStorage } from "src/core/offline/storage"

export type OutboxStorage = KeyValueStorage

export interface PendingDream {
  clientId: string // uuid
  userId: number
  values: Record<string, unknown> // CreateDream-shaped; dreamAt already an ISO string
  queuedAt: Date
  lastError?: string // set when the server rejected it (non-network, non-auth)
}

export interface SyncResult {
  synced: number
  authRequired: boolean
  blocked: boolean // network failure mid-run; retry on next trigger
}

export class OutboxWriteError extends Error {}

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
    try {
      await send(entry.values)
      removeFromOutbox(storage, userId, clientId)
      synced++
    } catch (error) {
      if (error instanceof TypeError) return { synced, authRequired: false, blocked: true }
      if (error instanceof Error && error.name === "AuthenticationError") {
        return { synced, authRequired: true, blocked: false }
      }
      writeOutbox(
        storage,
        userId,
        readOutbox(storage, userId).map((e) =>
          e.clientId === clientId ? { ...e, lastError: String(error) } : e
        )
      )
      notify()
    }
  }
  return { synced, authRequired: false, blocked: false }
}
