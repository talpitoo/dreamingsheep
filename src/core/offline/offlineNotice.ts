import { useSyncExternalStore } from "react"

// the one offline notification slot ("saved on this device", "synced"): the latest message
// replaces the previous one and stays until the user dismisses it — nothing auto-hides, so it is
// always clear what happened. Written by the dreams page and the sync engine, shown by
// OfflineSupport. Mirrors the tiny external store of src/auth/client.ts
export type OfflineNotice = { kind: "saved" | "synced"; count: number }

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
