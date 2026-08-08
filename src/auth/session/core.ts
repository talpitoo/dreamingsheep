import { createHmac, timingSafeEqual } from "crypto"

export * from "./public-data"

// (Buffer/crypto are fine here — core.ts is only ever imported server-side)

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_AFTER_MS = SESSION_TTL_MS / 2

export interface AnonymousPayload {
  publicData: Record<string, unknown>
  antiCSRFToken: string
  issuedAt: number
}

export const makeSessionToken = (handle: string, secret: string) => `${handle}.${secret}`

export function parseSessionToken(raw: string | undefined | null) {
  if (!raw) return null
  const dot = raw.indexOf(".")
  if (dot <= 0 || dot === raw.length - 1) return null
  return { handle: raw.slice(0, dot), secret: raw.slice(dot + 1) }
}

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
const unb64url = (s: string) => Buffer.from(s, "base64url").toString("utf8")
const hmac = (data: string, key: string) =>
  createHmac("sha256", key).update(data).digest("base64url")

export function signAnonymousPayload(payload: AnonymousPayload, key: string): string {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${hmac(body, key)}`
}

export function verifyAnonymousPayload(raw: string, key: string): AnonymousPayload | null {
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = hmac(body, key)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(unb64url(body)) as AnonymousPayload
  } catch {
    return null
  }
}

interface CookieOpts {
  httpOnly?: boolean
  maxAgeMs?: number
  expired?: boolean
  secure: boolean
}

export function serializeCookie(name: string, value: string, opts: CookieOpts): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"]
  if (opts.httpOnly) parts.push("HttpOnly")
  if (opts.secure) parts.push("Secure")
  if (opts.expired) parts.push("Max-Age=0")
  else if (opts.maxAgeMs !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAgeMs / 1000)}`)
  return parts.join("; ")
}
