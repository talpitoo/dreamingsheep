import { useSyncExternalStore } from "react"

// whether the last outbox sync stopped on the session (expired / CSRF mismatch): written by the
// sync engine in OfflineSupport, read by the banner that Layout renders under the header.
// Mirrors the tiny external store of src/auth/client.ts
let authRequired = false
const listeners = new Set<() => void>()

export function setSyncAuthRequired(value: boolean): void {
  if (value === authRequired) return
  authRequired = value
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): boolean {
  return authRequired
}

function serverSnapshot(): boolean {
  return false
}

export function useSyncAuthRequired(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
