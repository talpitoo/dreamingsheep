import { useSyncExternalStore } from "react"
import { decodePublicDataCookie, COOKIE_CSRF, COOKIE_PUBLIC_DATA } from "./session/public-data"
import { __setSessionNotifier } from "src/core/rpc-client"

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readCookieValue(name: string): string {
  if (typeof document === "undefined") return ""
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return hit ? safeDecode(hit.slice(name.length + 1)) : ""
}

export function readPublicDataFromCookie(): Record<string, unknown> {
  return decodePublicDataCookie(readCookieValue(COOKIE_PUBLIC_DATA)) ?? {}
}

export function getAntiCSRFToken(): string {
  return readCookieValue(COOKIE_CSRF)
}

// ---- tiny external store keyed on the raw cookie string ----------------------
const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedSession: Record<string, unknown> = {}

function snapshot() {
  const raw = readCookieValue(COOKIE_PUBLIC_DATA)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSession = decodePublicDataCookie(raw) ?? {}
  }
  return cachedSession
}

export function refreshSessionStore() {
  const before = cachedRaw
  snapshot()
  if (cachedRaw !== before) listeners.forEach((l) => l())
}
__setSessionNotifier(refreshSessionStore)

if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshSessionStore)
}

const EMPTY: Record<string, unknown> = {}

export interface ClientSession {
  userId: number | null
  username?: string
  role?: string
  verified?: boolean
  verifyUserToken?: string
  isLoading: false
}

export function useSession(): ClientSession {
  const publicData = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    snapshot,
    () => EMPTY
  )
  return {
    userId: (publicData.userId as number | undefined) ?? null,
    username: publicData.username as string | undefined,
    role: publicData.role as string | undefined,
    verified: publicData.verified as boolean | undefined,
    verifyUserToken: publicData.verifyUserToken as string | undefined,
    isLoading: false,
  }
}
