import { useEffect, useRef, useState } from "react"
import { IconButton, Snackbar } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import WifiIcon from "@mui/icons-material/Wifi"
import WifiOffIcon from "@mui/icons-material/WifiOff"
import { readPublicDataFromCookie, useSession } from "src/auth/client"
import { isBrowserOnline, useOnlineStatus } from "src/core/offline/onlineStatus"
import {
  forgetOtherUsersSnapshots,
  hydratePersistedQueries,
  PERSISTED_QUERY_KEYS,
  subscribeQueryPersistence,
} from "src/core/offline/persistedQueries"
import {
  dismissOfflineNotice,
  OfflineNotice,
  showOfflineNotice,
  useOfflineNotice,
} from "src/core/offline/offlineNotice"
import { registerServiceWorker } from "src/core/offline/swRegistration"
import { setSyncAuthRequired } from "src/core/offline/syncStatus"
import { getQueryClient, invalidateQuery } from "src/core/rpc-client"
import { getDreams, getDreamsByMonth } from "src/dreams/client"
import type { SyncResult } from "src/dreams/offline/outbox"
import { runSync } from "src/dreams/offline/syncRunner"
import { usePendingDreams } from "src/dreams/offline/usePendingDreams"

function noticeContent(notice: OfflineNotice) {
  if (notice.kind === "saved") {
    return (
      <span className="flex items-center gap-2">
        <WifiOffIcon fontSize="small" />
        {"saved on this device — it syncs when you're back online"}
      </span>
    )
  }
  if (notice.kind === "signOutOffline") {
    return (
      <span className="flex items-center gap-2">
        <WifiOffIcon fontSize="small" />
        {"you're offline — signing out needs a connection"}
      </span>
    )
  }
  if (notice.kind === "signOutPending") {
    const plural = notice.count > 1
    return (
      <span className="flex items-center gap-2">
        <ErrorOutlineIcon fontSize="small" />
        {`${notice.count} dream${
          plural ? "s" : ""
        } still waiting to sync — try again in a moment, or open ${
          plural ? "their" : "its"
        } day to retry or discard`}
      </span>
    )
  }
  if (notice.kind === "deleteFailed") {
    return (
      <span className="flex items-center gap-2">
        <ErrorOutlineIcon fontSize="small" />
        {"the account could not be deleted — please try again"}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <WifiIcon fontSize="small" />
      {`${notice.count} offline dream${notice.count > 1 ? "s" : ""} synced`}
    </span>
  )
}

// the user this tab last hydrated for: query keys carry no userId and the QueryClient is a module
// singleton, so when the cookie user changes under an open tab (a logout, or a login as someone
// else, in ANOTHER tab — cookies are shared) the previous user's queries must go before anything
// is hydrated or persisted under the new one. Header clears the cache only in the tab that logged
// out. Only a transition away from a logged-in user clears: a first login in this tab starts from
// a cache holding nothing private, and the login flow refreshes it as it always has.
let hydratedFor: number | null | undefined

// app-wide offline behaviour, mounted once in _app: query-cache hydration and persistence, the
// outbox sync, the corner ribbon, the offline notification snackbar (the banner lives in Layout)
export default function OfflineSupport() {
  const online = useOnlineStatus()
  const session = useSession()
  const pending = usePendingDreams()
  const notice = useOfflineNotice()
  // the last notice outlives its dismissal so the message stays put through the exit transition
  const lastNotice = useRef<OfflineNotice | null>(null)
  if (notice) lastNotice.current = notice
  const shownNotice = notice ?? lastNotice.current
  const [retryTick, setRetryTick] = useState(0)

  // boot per login: SW registration + query-cache hydration + persistence subscription.
  // The userId is read from the cookie (as AuthGuard does), NOT from useSession(): during React's
  // hydration pass the store still reports the empty server snapshot, and an effect keyed on it
  // would hydrate one render too late — after AuthGuard has mounted the page body, whose queries
  // are then paused without data on an offline cold start. Never hydrate during render: it would
  // change the first client render vs. the SSR output.
  useEffect(() => {
    // a new session starts without the previous one's "log in again"
    setSyncAuthRequired(false)
    registerServiceWorker()
    const userId = (readPublicDataFromCookie().userId as number | undefined) ?? null
    // resetQueries, not clear: clear() leaves the mounted observers pointing at removed queries,
    // so the previous user's data would stay on screen until the next render; a reset empties
    // every query and refetches the active ones under the new session
    if (typeof hydratedFor === "number" && hydratedFor !== userId) {
      void getQueryClient().resetQueries()
    }
    hydratedFor = userId
    // a shared device keeps no other user's journal copy (their outbox stays, see the helper)
    try {
      forgetOtherUsersSnapshots(window.localStorage, userId)
    } catch {
      // blocked storage: nothing stored, nothing to forget
    }
    if (!userId) return
    // before hydrating, so the replayed queries are built with it: react-query drops a query
    // nobody observes once cacheTime (5 min by default) has passed, which would silently turn a
    // cached day into "not cached" offline while the snapshot on disk still has it
    for (const key of PERSISTED_QUERY_KEYS) {
      getQueryClient().setQueryDefaults([key], { cacheTime: Infinity })
    }
    // localStorage can be blocked while cookies work: then the app runs without the offline
    // cache instead of throwing into the error boundary on every page
    try {
      hydratePersistedQueries(window.localStorage, userId, getQueryClient())
      // another tab's logout purges this user's snapshot before this tab's session store
      // notices (on focus or its next RPC): a write in between must not re-create it
      return subscribeQueryPersistence(
        window.localStorage,
        userId,
        getQueryClient(),
        () => readPublicDataFromCookie().userId === userId
      )
    } catch {
      return undefined
    }
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
      setSyncAuthRequired(result.authRequired)
      if (result.synced > 0) {
        void invalidateQuery(getDreams)
        void invalidateQuery(getDreamsByMonth)
        showOfflineNotice({ kind: "synced", count: result.synced })
      }
      if (result.blocked && isBrowserOnline()) {
        retry = setTimeout(() => setRetryTick((tick) => tick + 1), 60_000)
      }
    }
    // a storage failure inside the run must not surface as an unhandled rejection
    void runSync(userId, handle).catch(() => undefined)
    return () => clearTimeout(retry)
  }, [online, session.userId, syncable, retryTick])

  // content images go gray while offline (`html[data-offline] img` in index.css): blog covers,
  // the page sheep, the cookie monster — the offline look without swapping any asset
  useEffect(() => {
    document.documentElement.toggleAttribute("data-offline", !online)
  }, [online])

  return (
    <>
      {/* a constant cue after the in-flow banner has scrolled away, compact enough to only mark
          the corner: taps pass through to the header, screen readers get the banner instead */}
      {!online && (
        <div
          aria-hidden="true"
          className="fixed top-0 right-0 z-1400 w-16 h-16 overflow-hidden pointer-events-none"
        >
          <span className="absolute block w-32 pl-4 text-center rotate-45 top-3 -right-8 bg-mui-primary text-white text-[10px] leading-4 font-bold uppercase tracking-wider shadow">
            offline
          </span>
        </div>
      )}
      {/* stays until dismissed with its x: no autoHideDuration, and a click elsewhere is not a
          dismissal — the user should always be able to see what happened */}
      <Snackbar
        open={notice !== null}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        onClose={(_, reason) => reason !== "clickaway" && dismissOfflineNotice()}
        message={shownNotice && noticeContent(shownNotice)}
        action={
          <IconButton
            size="small"
            aria-label="dismiss"
            color="inherit"
            onClick={dismissOfflineNotice}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </>
  )
}
