import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { KeyValueStorage } from "src/core/offline/storage"
import { enqueueDream, readOutbox } from "src/dreams/offline/outbox"
import { runSync, syncNow } from "src/dreams/offline/syncRunner"

// the session cookie and the RPC transport are the runner's two seams to the browser
const session = vi.hoisted(() => ({ userId: 1 as number | undefined }))
const rpcFetch = vi.hoisted(() => vi.fn())
vi.mock("src/auth/client", () => ({
  readPublicDataFromCookie: () => ({ userId: session.userId }),
}))
vi.mock("src/core/rpc-client", () => ({ rpcFetch }))

function fakeStorage(): KeyValueStorage {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

// a Web Locks stand-in whose lock is always free: the callback runs at once
const freeLocks = {
  request: (_name: string, _options: unknown, callback: (lock: unknown) => unknown) =>
    Promise.resolve(callback({})),
}

let storage: KeyValueStorage

beforeEach(() => {
  session.userId = 1
  rpcFetch.mockReset()
  storage = fakeStorage()
  vi.stubGlobal("window", { localStorage: storage })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("syncRunner", () => {
  it("syncNow still syncs where Web Locks exist but AbortSignal.timeout does not", async () => {
    // Safari 15.4–15.7, Chrome 69–102, Firefox 96–99
    const timeout = Object.getOwnPropertyDescriptor(AbortSignal, "timeout")!
    Object.defineProperty(AbortSignal, "timeout", { value: undefined, configurable: true })
    try {
      vi.useFakeTimers()
      vi.stubGlobal("navigator", { locks: freeLocks })
      enqueueDream(storage, 1, { n: 1 })
      rpcFetch.mockResolvedValue({ id: 1 })

      expect(await syncNow(1)).toEqual({ synced: 1, authRequired: false, blocked: false })
      expect(readOutbox(storage, 1)).toEqual([])
      expect(vi.getTimerCount()).toBe(0) // the wait's timer does not outlive the run
    } finally {
      Object.defineProperty(AbortSignal, "timeout", timeout)
    }
  })

  it("syncNow stops waiting for a lock held elsewhere once the timeout passes, without syncing", async () => {
    vi.useFakeTimers()
    // another tab holds the lock and never lets go: the request settles only through its signal
    const request = vi.fn(
      (_name: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(options.signal.reason))
        })
    )
    vi.stubGlobal("navigator", { locks: { request } })
    enqueueDream(storage, 1, { n: 1 })
    let settled = false
    const pending = syncNow(1).then((result) => {
      settled = true
      return result
    })

    await vi.advanceTimersByTimeAsync(9_999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toBeUndefined()
    expect(rpcFetch).not.toHaveBeenCalled()
    expect(readOutbox(storage, 1)).toHaveLength(1)
  })

  it("runSync reports the result while the session is still the one the run started for", async () => {
    vi.stubGlobal("navigator", {}) // no Web Locks: the per-tab guard alone
    enqueueDream(storage, 1, { n: 1 })
    rpcFetch.mockResolvedValue({ id: 1 })
    const onResult = vi.fn()

    await runSync(1, onResult)

    expect(onResult).toHaveBeenCalledWith({ synced: 1, authRequired: false, blocked: false })
  })

  it("runSync drops the result of a run that outlived its session (logout → login mid-run)", async () => {
    vi.stubGlobal("navigator", {})
    enqueueDream(storage, 1, { n: 1 })
    rpcFetch.mockImplementation(async () => {
      session.userId = 2 // someone else logs in on this device while the request is in flight
      return { id: 1 }
    })
    const onResult = vi.fn()

    await runSync(1, onResult)

    expect(readOutbox(storage, 1)).toEqual([]) // the dream itself made it home
    expect(onResult).not.toHaveBeenCalled() // but user 2 gets no banner or snackbar for it
  })
})
