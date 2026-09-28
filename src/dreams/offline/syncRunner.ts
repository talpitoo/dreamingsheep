import { readPublicDataFromCookie } from "src/auth/client"
import { AuthenticationError } from "src/core/errors"
import { rpcFetch } from "src/core/rpc-client"
import { syncOutbox } from "src/dreams/offline/outbox"
import type { SyncResult } from "src/dreams/offline/outbox"

// shared by runSync and syncNow: the one resource name both must lock/reference so a run
// started by either can never overlap a run started by the other
function outboxLockName(userId: number): string {
  return `ds.outbox.sync.${userId}`
}

// module-level: at most one sync run per tab, whatever re-renders happen …
let syncing = false
// … but a trigger arriving mid-run (a "retry" click, a new entry, a login) is not dropped: the run
// may already have walked past that entry, so it gets one more pass afterwards, for the latest
// caller (after a logout → login mid-run, that is the new session's user)
let rerunRequested: { userId: number; onResult: (result: SyncResult) => void } | null = null
// the currently in-flight run, for browsers without the Web Locks API: syncNow awaits this
// instead of a lock so it still can't start while the engine's own run is mid-flight. Cleared
// once a run finishes with nothing queued behind it; a rerun leaves it alone, since by then the
// rerun has already pointed this at its own promise.
let current: Promise<void> | null = null

// … and at most one per browser: the `online` event fires in every open tab at once, and two
// tabs replaying the same entry would create it twice. The Web Locks API (Chrome 69+,
// Firefox 96+, Safari 15.4+, no dependency) serialises them; `ifAvailable` makes the loser
// skip instead of queueing. Older browsers fall back to the per-tab guard.
export async function runSync(
  userId: number,
  onResult: (result: SyncResult) => void
): Promise<void> {
  if (syncing) {
    rerunRequested = { userId, onResult }
    return
  }
  syncing = true
  const run = async () => {
    const result = await syncOutbox(window.localStorage, userId, (values) => {
      // a run can outlive its session (a request hanging across logout → login as someone else):
      // one user's queued dreams must never go out with another user's cookie
      if (readPublicDataFromCookie().userId !== userId) throw new AuthenticationError()
      return rpcFetch("createDream", values)
    })
    onResult(result)
  }
  const done = (async () => {
    try {
      if (navigator.locks) {
        await navigator.locks.request(outboxLockName(userId), { ifAvailable: true }, (lock) =>
          lock ? run() : Promise.resolve()
        )
      } else {
        await run()
      }
    } finally {
      syncing = false
      const next = rerunRequested
      rerunRequested = null
      if (next) void runSync(next.userId, next.onResult).catch(() => undefined)
      else current = null
    }
  })()
  current = done
  await done
}

// The logout path's counterpart to runSync: instead of skipping when busy (runSync's
// ifAvailable), this WAITS for the same lock — or, without Web Locks, the same in-flight
// promise — the engine holds, so it can never overlap an in-flight run and double-submit an
// entry. Whatever it waited on has already finished and removed what it synced by the time this
// reads the outbox, so it only ever sends what's genuinely still left. Never throws: logout must
// proceed whatever happens here.
export async function syncNow(userId: number): Promise<SyncResult | undefined> {
  const run = () =>
    syncOutbox(window.localStorage, userId, (values) => {
      if (readPublicDataFromCookie().userId !== userId) throw new AuthenticationError()
      return rpcFetch("createDream", values)
    })
  try {
    if (navigator.locks) {
      return await navigator.locks.request(outboxLockName(userId), run)
    }
    if (current) await current.catch(() => undefined)
    return await run()
  } catch {
    return undefined
  }
}
