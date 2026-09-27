import { useEffect, useState } from "react"
import { Alert, Snackbar } from "@mui/material"
import { readPublicDataFromCookie, useSession } from "src/auth/client"
import { isBrowserOnline, useOnlineStatus } from "src/core/offline/onlineStatus"
import {
  hydratePersistedQueries,
  subscribeQueryPersistence,
} from "src/core/offline/persistedQueries"
import { registerServiceWorker } from "src/core/offline/swRegistration"
import { getQueryClient, invalidateQuery, rpcFetch } from "src/core/rpc-client"
import { getDreams, getDreamsByMonth } from "src/dreams/client"
import { syncOutbox } from "src/dreams/offline/outbox"
import type { SyncResult } from "src/dreams/offline/outbox"
import { usePendingDreams } from "src/dreams/offline/usePendingDreams"

// module-level: at most one sync run per tab, whatever re-renders happen …
let syncing = false

// … and at most one per browser: the `online` event fires in every open tab at once, and two
// tabs replaying the same entry would create it twice. The Web Locks API (Chrome 69+,
// Firefox 96+, Safari 15.4+, no dependency) serialises them; `ifAvailable` makes the loser
// skip instead of queueing. Older browsers fall back to the per-tab guard.
async function runSync(userId: number, onResult: (result: SyncResult) => void): Promise<void> {
  if (syncing) return
  syncing = true
  const run = async () => {
    const result = await syncOutbox(window.localStorage, userId, (values) =>
      rpcFetch("createDream", values)
    )
    onResult(result)
  }
  try {
    if (navigator.locks) {
      await navigator.locks.request(`ds.outbox.sync.${userId}`, { ifAvailable: true }, (lock) =>
        lock ? run() : Promise.resolve()
      )
    } else {
      await run()
    }
  } finally {
    syncing = false
  }
}

// app-wide offline behaviour, mounted once in _app: query-cache hydration and persistence, the
// outbox sync, the offline banner and corner ribbon, the "synced" snackbar
export default function OfflineSupport() {
  const online = useOnlineStatus()
  const session = useSession()
  const pending = usePendingDreams()
  // open is its own state so the message keeps its count through the snackbar's exit transition
  const [syncedOpen, setSyncedOpen] = useState(false)
  const [syncedCount, setSyncedCount] = useState(0)
  const [authRequired, setAuthRequired] = useState(false)
  const [retryTick, setRetryTick] = useState(0)

  // boot per login: SW registration + query-cache hydration + persistence subscription.
  // The userId is read from the cookie (as AuthGuard does), NOT from useSession(): during React's
  // hydration pass the store still reports the empty server snapshot, and an effect keyed on it
  // would hydrate one render too late — after AuthGuard has mounted the page body, whose queries
  // are then paused without data on an offline cold start. Never hydrate during render: it would
  // change the first client render vs. the SSR output.
  useEffect(() => {
    registerServiceWorker()
    const userId = (readPublicDataFromCookie().userId as number | undefined) ?? null
    if (!userId) return
    hydratePersistedQueries(window.localStorage, userId, getQueryClient())
    return subscribeQueryPersistence(window.localStorage, userId, getQueryClient())
  }, [session.userId])

  // sync on: coming online, app start, login (userId change), new queue entries. A `blocked`
  // result while online means the server, not the network, is unavailable (e.g. nginx's
  // maintenance page during a deploy) — the online event will not fire again by itself, so
  // retry after a minute.
  // The dependency is the number of SYNCABLE entries, not the queue length: the "retry" button
  // only clears an entry's lastError, and that must re-trigger a run.
  // The retry re-runs this effect instead of calling runSync itself: a run outlives the effect
  // run that started it (every entry it syncs or parks changes `syncable`), so its timer can
  // escape the cleanup — re-running the effect re-checks online/login/queue as they are by then.
  const syncable = pending.filter((entry) => !entry.lastError).length
  useEffect(() => {
    if (!online || !session.userId || syncable === 0) return
    const userId = session.userId
    let retry: ReturnType<typeof setTimeout> | undefined
    const handle = (result: SyncResult) => {
      setAuthRequired(result.authRequired)
      if (result.synced > 0) {
        void invalidateQuery(getDreams)
        void invalidateQuery(getDreamsByMonth)
        setSyncedCount(result.synced)
        setSyncedOpen(true)
      }
      if (result.blocked && isBrowserOnline()) {
        retry = setTimeout(() => setRetryTick((tick) => tick + 1), 60_000)
      }
    }
    void runSync(userId, handle)
    return () => clearTimeout(retry)
  }, [online, session.userId, syncable, retryTick])

  return (
    <>
      {(!online || (authRequired && pending.length > 0)) && (
        <Alert severity="info" className="fixed top-0 inset-x-0 z-1400 rounded-none justify-center">
          {!online
            ? pending.length > 0
              ? `you're offline — ${pending.length} dream${
                  pending.length > 1 ? "s" : ""
                } tucked away, they'll sync when you're back`
              : "you're offline — dreams you add are saved on this device until you're back"
            : `please log in again to sync ${pending.length} pending dream${
                pending.length > 1 ? "s" : ""
              }`}
        </Alert>
      )}
      {/* a constant cue even when the banner is missed — decorative: screen readers get the banner */}
      {!online && (
        <div
          aria-hidden="true"
          className="fixed top-0 right-0 z-1400 w-24 h-24 overflow-hidden pointer-events-none"
        >
          <span className="absolute block w-36 text-center rotate-45 top-6 -right-9 bg-mui-primary text-white text-xs font-bold uppercase tracking-widest py-1 shadow-md">
            offline
          </span>
        </div>
      )}
      <Snackbar
        open={syncedOpen}
        autoHideDuration={6000}
        onClose={() => setSyncedOpen(false)}
        message={`${syncedCount} dream${syncedCount > 1 ? "s" : ""} made it home 🐑`}
      />
    </>
  )
}
