import { useSyncExternalStore } from "react"

// mirrors the tiny-external-store pattern of src/auth/client.ts
function subscribe(callback: () => void) {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

export function isBrowserOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, isBrowserOnline, () => true)
}
