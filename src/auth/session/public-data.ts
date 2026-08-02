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
