import { beforeEach, describe, expect, it } from "vitest"
import { getSession, __setDbForTests } from "./index"
import {
  COOKIE_ANON,
  COOKIE_CSRF,
  COOKIE_PUBLIC_DATA,
  COOKIE_SESSION,
  makeSessionToken,
} from "./core"
import { hash256 } from "src/core/tokens"
import { AuthenticationError, AuthorizationError, CSRFTokenMismatchError } from "src/core/errors"

type Row = {
  id: number
  handle: string
  hashedSessionToken: string
  antiCSRFToken: string
  publicData: string
  expiresAt: Date
  userId: number | null
}

function fakeDb(rows: Row[] = []) {
  let nextId = rows.length + 1
  return {
    rows,
    session: {
      findFirst: async ({ where }: any) => rows.find((r) => r.handle === where.handle) ?? null,
      create: async ({ data }: any) => {
        const row: Row = {
          id: nextId++,
          handle: data.handle,
          hashedSessionToken: data.hashedSessionToken,
          antiCSRFToken: data.antiCSRFToken,
          publicData: data.publicData,
          expiresAt: data.expiresAt,
          userId: data.user?.connect?.id ?? null,
        }
        rows.push(row)
        return row
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.handle === where.handle)!
        Object.assign(row, data)
        return row
      },
      deleteMany: async ({ where }: any) => {
        const before = rows.length
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i]!.handle === where.handle) rows.splice(i, 1)
        }
        return { count: before - rows.length }
      },
    },
  }
}

function fakeReqRes({
  cookies = {},
  method = "POST",
  headers = {} as Record<string, string>,
} = {}) {
  const setCookies: string[] = []
  const req = { method, cookies, headers } as any
  const res = {
    setHeader: (name: string, value: string[] | string) => {
      if (name.toLowerCase() === "set-cookie") {
        setCookies.length = 0
        setCookies.push(...(Array.isArray(value) ? value : [value]))
      }
    },
    getHeader: (name: string) =>
      name.toLowerCase() === "set-cookie" ? [...setCookies] : undefined,
  } as any
  return { req, res, setCookies }
}

const readCookie = (setCookies: string[], name: string) =>
  setCookies.find((c) => c.startsWith(`${name}=`))

const validRow = (): Row => ({
  id: 1,
  handle: "h",
  hashedSessionToken: hash256("secret"),
  antiCSRFToken: "csrf-tok",
  publicData: JSON.stringify({ userId: 7, username: "z", role: "DEMO", verified: true }),
  expiresAt: new Date(Date.now() + 86_400_000 * 20),
  userId: 7,
})

describe("getSession", () => {
  beforeEach(() => __setDbForTests(fakeDb()))

  it("fresh request → anonymous session, cookies issued, no CSRF required", async () => {
    const { req, res, setCookies } = fakeReqRes({ method: "POST" })
    const session = await getSession(req, res)
    expect(session.userId).toBeNull()
    expect(readCookie(setCookies, COOKIE_ANON)).toBeTruthy()
    expect(readCookie(setCookies, COOKIE_CSRF)).toBeTruthy()
  })

  it("$create persists a DB row and switches cookies to authenticated", async () => {
    const db = fakeDb()
    __setDbForTests(db)
    const { req, res, setCookies } = fakeReqRes()
    const session = await getSession(req, res)
    await session.$create({ userId: 7, username: "zhuangzi", role: "DEMO", verified: true })
    expect(db.rows).toHaveLength(1)
    expect(db.rows[0]!.userId).toBe(7)
    expect(readCookie(setCookies, COOKIE_SESSION)).toContain("HttpOnly")
    expect(readCookie(setCookies, COOKIE_PUBLIC_DATA)).toBeTruthy()
    expect(session.userId).toBe(7)
  })

  it("valid session cookie + matching anti-csrf header authenticates", async () => {
    __setDbForTests(fakeDb([validRow()]))
    const { req, res } = fakeReqRes({
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
      headers: { "anti-csrf": "csrf-tok" },
    })
    const session = await getSession(req, res)
    expect(session.userId).toBe(7)
    expect(session.role).toBe("DEMO")
  })

  it("valid session cookie with wrong anti-csrf header throws CSRFTokenMismatchError", async () => {
    __setDbForTests(fakeDb([validRow()]))
    const { req, res } = fakeReqRes({
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
      headers: { "anti-csrf": "WRONG" },
    })
    await expect(getSession(req, res)).rejects.toBeInstanceOf(CSRFTokenMismatchError)
  })

  it("skipCsrf skips the check; GET skips the check", async () => {
    __setDbForTests(fakeDb([validRow()]))
    const a = fakeReqRes({ cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") } })
    await expect(getSession(a.req, a.res, { skipCsrf: true })).resolves.toBeTruthy()
    __setDbForTests(fakeDb([validRow()]))
    const b = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    await expect(getSession(b.req, b.res)).resolves.toBeTruthy()
  })

  it("wrong secret for a known handle falls back to anonymous", async () => {
    __setDbForTests(fakeDb([validRow()]))
    const { req, res } = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "WRONG-secret") },
    })
    const session = await getSession(req, res)
    expect(session.userId).toBeNull()
  })

  it("expired session row falls back to anonymous", async () => {
    const expired = { ...validRow(), expiresAt: new Date(Date.now() - 1000) }
    __setDbForTests(fakeDb([expired]))
    const { req, res } = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    const session = await getSession(req, res)
    expect(session.userId).toBeNull()
  })

  it("sliding refresh bumps expiresAt when less than half the TTL remains", async () => {
    const db = fakeDb([{ ...validRow(), expiresAt: new Date(Date.now() + 86_400_000 * 5) }])
    __setDbForTests(db)
    const { req, res } = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    await getSession(req, res)
    expect(db.rows[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 86_400_000 * 29)
  })

  it("anonymous $setPublicData survives a round-trip (signup → verify flow)", async () => {
    const first = fakeReqRes()
    const s1 = await getSession(first.req, first.res)
    await s1.$setPublicData({ username: "meh-6", verifyUserToken: "hashed-tok" })
    const anonCookie = readCookie(first.setCookies, COOKIE_ANON)!
    const value = decodeURIComponent(anonCookie.split(";")[0]!.split("=").slice(1).join("="))
    const second = fakeReqRes({ method: "GET", cookies: { [COOKIE_ANON]: value } })
    const s2 = await getSession(second.req, second.res)
    expect(s2.username).toBe("meh-6")
    expect(s2.verifyUserToken).toBe("hashed-tok")
    expect(s2.userId).toBeNull()
  })

  it("$revoke deletes the row and expires cookies", async () => {
    const db = fakeDb()
    __setDbForTests(db)
    const { req, res, setCookies } = fakeReqRes()
    const session = await getSession(req, res)
    await session.$create({ userId: 7, username: "z", role: "USER", verified: true })
    await session.$revoke()
    expect(db.rows).toHaveLength(0)
    expect(readCookie(setCookies, COOKIE_SESSION)).toContain("Max-Age=0")
    expect(session.userId).toBeNull()
  })

  it("$setPublicData on an authenticated session updates the DB row", async () => {
    const db = fakeDb([validRow()])
    __setDbForTests(db)
    const { req, res } = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    const session = await getSession(req, res)
    await session.$setPublicData({ username: "renamed" })
    expect(JSON.parse(db.rows[0]!.publicData).username).toBe("renamed")
    expect(session.username).toBe("renamed")
  })

  it("$authorize: anonymous → AuthenticationError; wrong role → AuthorizationError", async () => {
    const { req, res } = fakeReqRes()
    const anon = await getSession(req, res)
    expect(() => anon.$authorize()).toThrow(AuthenticationError)
    await anon.$create({ userId: 7, username: "z", role: "USER", verified: true })
    expect(() => anon.$authorize()).not.toThrow()
    expect(() => anon.$authorize("ADMIN")).toThrow(AuthorizationError)
    expect(() => anon.$authorize(["ADMIN", "USER"])).not.toThrow()
  })
})
