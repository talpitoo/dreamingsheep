// Cookie names keep the Blitz-era "dreamingsheep_s*" prefix (spec §5.3).
// This module is imported client-side (src/auth/client.ts) — NO crypto, NO Buffer.
export const COOKIE_SESSION = "dreamingsheep_sSessionToken"
export const COOKIE_ANON = "dreamingsheep_sAnonymousSessionToken"
export const COOKIE_CSRF = "dreamingsheep_sAntiCsrfToken"
export const COOKIE_PUBLIC_DATA = "dreamingsheep_sPublicDataToken"

export function encodePublicDataCookie(publicData: Record<string, unknown>): string {
  return JSON.stringify(publicData)
}

export function decodePublicDataCookie(raw: string | undefined | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

// Shared browser-side cookie reader (single home so the cookie names above and
// the code that reads them can never drift apart).
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function readCookieValue(name: string): string {
  if (typeof document === "undefined") return ""
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return hit ? safeDecode(hit.slice(name.length + 1)) : ""
}
