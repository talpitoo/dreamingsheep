import { clearPersistedQueries } from "src/core/offline/persistedQueries"
import { getQueryClient } from "src/core/rpc-client"
import { clearOutbox } from "src/dreams/offline/outbox"

// Everything a session leaves on this device, forgotten in one go — shared by logout and account
// deletion so the two can never drift: the in-memory query cache (query keys carry no userId and
// the QueryClient is a module singleton, so user A's dreams would otherwise sit in memory for
// user B and get persisted under B's key), the user's outbox and query snapshot in localStorage,
// and the worker's runtime page cache. Never throws: a storage exception (quota, private mode)
// must not stop a logout or a deletion.
export function forgetDeviceData(userId: number | null | undefined): void {
  getQueryClient().clear()
  try {
    if (userId) {
      clearOutbox(window.localStorage, userId)
      clearPersistedQueries(window.localStorage, userId)
    }
  } catch {
    // a blocked or full storage: nothing to forget there
  }
  navigator.serviceWorker?.controller?.postMessage("ds-logout")
}
