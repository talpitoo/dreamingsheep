import { describe, expect, it } from "vitest"
import {
  makeSessionToken,
  parseSessionToken,
  signAnonymousPayload,
  verifyAnonymousPayload,
  encodePublicDataCookie,
  decodePublicDataCookie,
  serializeCookie,
  COOKIE_SESSION,
} from "./core"

describe("session token format", () => {
  it("round-trips handle + secret", () => {
    expect(parseSessionToken(makeSessionToken("h1", "s1"))).toEqual({ handle: "h1", secret: "s1" })
  })
  it("rejects malformed tokens", () => {
    expect(parseSessionToken("")).toBeNull()
    expect(parseSessionToken("no-separator")).toBeNull()
  })
})

describe("anonymous payload signing", () => {
  const payload = {
    publicData: { username: "meh", verifyUserToken: "t" },
    antiCSRFToken: "c",
    issuedAt: 1_700_000_000_000,
  }
  it("round-trips with the right key", () => {
    expect(verifyAnonymousPayload(signAnonymousPayload(payload, "key1"), "key1")).toEqual(payload)
  })
  it("rejects a tampered payload and a wrong key", () => {
    const signed = signAnonymousPayload(payload, "key1")
    expect(verifyAnonymousPayload(signed, "key2")).toBeNull()
    expect(verifyAnonymousPayload(signed.slice(0, -2) + "xx", "key1")).toBeNull()
    expect(verifyAnonymousPayload("garbage", "key1")).toBeNull()
  })
})

describe("public data cookie", () => {
  it("round-trips publicData", () => {
    const pd = { userId: 7, username: "zhuangzi", role: "DEMO", verified: true }
    expect(decodePublicDataCookie(encodePublicDataCookie(pd))).toEqual(pd)
  })
  it("returns null for garbage", () => {
    expect(decodePublicDataCookie("%%%")).toBeNull()
  })
})

describe("serializeCookie", () => {
  it("sets HttpOnly, Path, SameSite=Lax and Max-Age", () => {
    const c = serializeCookie(COOKIE_SESSION, "v", {
      httpOnly: true,
      maxAgeMs: 60_000,
      secure: false,
    })
    expect(c).toContain(`${COOKIE_SESSION}=v`)
    expect(c).toContain("HttpOnly")
    expect(c).toContain("Path=/")
    expect(c).toContain("SameSite=Lax")
    expect(c).toContain("Max-Age=60")
    expect(c).not.toContain("Secure")
  })
  it("expired cookies get Max-Age=0 and secure adds the Secure attribute", () => {
    const c = serializeCookie(COOKIE_SESSION, "", { expired: true, secure: true })
    expect(c).toContain("Max-Age=0")
    expect(c).toContain("Secure")
  })
})
