import { readPublicDataFromCookie } from "src/auth/client"
import { AuthenticationError } from "src/core/errors"
import { rpcFetch } from "src/core/rpc-client"
import { readOutbox, syncOutbox } from "src/dreams/offline/outbox"
import type { SyncResult } from "src/dreams/offline/outbox"

// syncNow (below) waits rather than skips, but not forever: a stalled request — this tab's own
// or another tab's, holding the lock or the in-flight claim — must not hold up logout indefinitely
const SYNC_NOW_TIMEOUT_MS = 10_000

// shared by runSync and syncNow: the one resource name both must lock/reference so a run
// started by either can never overlap a run started by the other
function outboxLockName(userId: number): string {
  return `ds.outbox.sync.${userId}`
}

// shared by runSync and syncNow: a run can outlive its session (a request hanging across
// logout → login as someone else) — one user's queued dreams must never go out with another
// user's cookie
function sendFor(userId: number): (values: Record<string, unknown>) => Promise<unknown> {
  return (values) => {
    if (readPublicDataFromCookie().userId !== userId) throw new AuthenticationError()
    return rpcFetch("createDream", values)
  }
}

// module-level: at most one sync run per tab, whatever re-renders happen …
let syncing = false
// … but a trigger arriving mid-run (a "retry" click, a new entry, a login) is not dropped: the run
// may already have walked past that entry, so it gets one more pass afterwards, for the latest
// caller (after a logout → login mid-run, that is the new session's user)
let rerunRequested: { userId: number; onResult: (result: SyncResult) => void } | null = null
// the currently in-flight run, for browsers without the Web Locks API: syncNow's fallback waits
// on this (in a loop — see below) before claiming `syncing` itself. Cleared once a run finishes
// with nothing queued behind it; a rerun leaves it alone, since by then the rerun has already
// pointed this at its own promise.
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
    const result = await syncOutbox(window.localStorage, userId, sendFor(userId))
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
// ifAvailable), this WAITS for the same lock — or, without Web Locks, the same per-tab guard —
// so it can never overlap a run and double-submit an entry. It reads the outbox itself, before
// requesting anything: an empty outbox means there is nothing worth waiting for. The wait is
// bounded (SYNC_NOW_TIMEOUT_MS) so a stalled request can't hold up logout indefinitely, and the
// whole thing never throws — logout must proceed whatever happens here (blocked storage, a
// timed-out wait, a failed sync, ...).
export async function syncNow(userId: number): Promise<SyncResult | undefined> {
  try {
    if (readOutbox(window.localStorage, userId).length === 0) return undefined

    if (navigator.locks) {
      return await navigator.locks.request(
        outboxLockName(userId),
        { signal: AbortSignal.timeout(SYNC_NOW_TIMEOUT_MS) },
        () => syncOutbox(window.localStorage, userId, sendFor(userId))
      )
    }

    // No Web Locks: wait for whatever is in flight. A loop, not one snapshot of `current` —
    // the run we wait on can itself hand off to a queued rerun in its own `finally` (see
    // runSync above), which replaces `current` with a new promise before this one settles, and
    // that next run also has to finish before it's safe to proceed.
    const deadline = Date.now() + SYNC_NOW_TIMEOUT_MS
    while (current) {
      if (Date.now() >= deadline) return undefined
      await current.catch(() => undefined)
    }

    // Nothing in flight: claim the same guard runSync uses, so a run starting the instant after
    // this check (an effect re-trigger, a "retry" click) defers to this one via rerunRequested
    // instead of racing it.
    syncing = true
    let result: SyncResult | undefined
    const done = (async () => {
      try {
        result = await syncOutbox(window.localStorage, userId, sendFor(userId))
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
    return result
  } catch {
    return undefined
  }
}
