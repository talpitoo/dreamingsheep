import { useSyncExternalStore } from "react"

// the one persistent notification slot ("saved on this device", "synced", a refused offline
// sign-out, a failed account deletion): the latest message replaces the previous one and stays
// until the user dismisses it — nothing auto-hides, so it is always clear what happened. Written
// by the dreams page, the sync engine, Header and the settings form; shown by OfflineSupport,
// which owns the copy. Mirrors the tiny external store of src/auth/client.ts
export type OfflineNotice =
  | { kind: "saved"; count: number }
  | { kind: "synced"; count: number }
  | { kind: "signOutOffline" }
  | { kind: "signOutPending"; count: number }
  | { kind: "deleteFailed" }

let notice: OfflineNotice | null = null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function showOfflineNotice(next: OfflineNotice): void {
  notice = next
  notify()
}

export function dismissOfflineNotice(): void {
  if (notice === null) return
  notice = null
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): OfflineNotice | null {
  return notice
}

function serverSnapshot(): OfflineNotice | null {
  return null
}

export function useOfflineNotice(): OfflineNotice | null {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
