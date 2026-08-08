import { afterEach, describe, expect, it, vi } from "vitest"
import { readPublicDataFromCookie, getAntiCSRFToken } from "./client"
import { encodePublicDataCookie, COOKIE_PUBLIC_DATA, COOKIE_CSRF } from "./session/public-data"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("auth client cookie readers", () => {
  it("parses publicData from the readable cookie", () => {
    const pd = { userId: 7, username: "zhuangzi", role: "DEMO", verified: true }
    vi.stubGlobal("document", {
      cookie: `foo=bar; ${COOKIE_PUBLIC_DATA}=${encodeURIComponent(encodePublicDataCookie(pd))}`,
    })
    expect(readPublicDataFromCookie()).toEqual(pd)
  })
  it("returns empty session when the cookie is missing or garbled", () => {
    vi.stubGlobal("document", { cookie: "" })
    expect(readPublicDataFromCookie()).toEqual({})
    vi.stubGlobal("document", { cookie: `${COOKIE_PUBLIC_DATA}=%%%garbage` })
    expect(readPublicDataFromCookie()).toEqual({})
  })
  it("reads the anti-csrf cookie", () => {
    vi.stubGlobal("document", { cookie: `${COOKIE_CSRF}=tok-1` })
    expect(getAntiCSRFToken()).toBe("tok-1")
  })
})
