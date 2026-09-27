import { useSyncExternalStore } from "react"
import { useSession } from "src/auth/client"
import { outboxKey, readOutbox, subscribeOutbox } from "src/dreams/offline/outbox"
import type { PendingDream } from "src/dreams/offline/outbox"

const EMPTY: readonly PendingDream[] = Object.freeze([])

// useSyncExternalStore re-renders forever unless an unchanged queue returns the very same array,
// so the parse is cached on the user and the raw storage string (like src/auth/client.ts caches
// the session cookie)
let cached: { userId: number; raw: string; entries: readonly PendingDream[] } | null = null

function readRaw(userId: number): string | null {
  try {
    return window.localStorage.getItem(outboxKey(userId))
  } catch {
    return null // storage blocked: nothing can have been queued on this device
  }
}

function snapshot(userId: number | null): readonly PendingDream[] {
  const raw = userId ? readRaw(userId) : null
  if (!userId || raw === null) {
    cached = null // logged out or queue cleared: keep no dream text around in memory
    return EMPTY
  }
  if (cached?.userId !== userId || cached.raw !== raw) {
    cached = { userId, raw, entries: readOutbox(window.localStorage, userId) }
  }
  return cached.entries
}

// subscribeOutbox reports this tab's writes, the storage event the other tabs'
function subscribe(onChange: () => void): () => void {
  const unsubscribe = subscribeOutbox(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    unsubscribe()
    window.removeEventListener("storage", onChange)
  }
}

function serverSnapshot(): readonly PendingDream[] {
  return EMPTY
}

// the logged-in user's queued dreams, live
export function usePendingDreams(): readonly PendingDream[] {
  const { userId } = useSession()
  return useSyncExternalStore(subscribe, () => snapshot(userId), serverSnapshot)
}
