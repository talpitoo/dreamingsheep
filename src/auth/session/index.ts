import type { IncomingMessage, ServerResponse } from "http"
import {
  AnonymousPayload,
  COOKIE_ANON,
  COOKIE_CSRF,
  COOKIE_PUBLIC_DATA,
  COOKIE_SESSION,
  REFRESH_AFTER_MS,
  SESSION_TTL_MS,
  encodePublicDataCookie,
  makeSessionToken,
  parseSessionToken,
  serializeCookie,
  signAnonymousPayload,
  verifyAnonymousPayload,
} from "./core"
import { generateToken, hash256 } from "src/core/tokens"
import { AuthenticationError, AuthorizationError, CSRFTokenMismatchError } from "src/core/errors"

export interface PublicData {
  userId: number
  username: string
  role: string
  verified: boolean
  verifyUserToken?: string
}

export interface SessionContext {
  readonly userId: number | null
  readonly username?: string
  readonly role?: string
  readonly verified?: boolean
  readonly verifyUserToken?: string
  $create(publicData: PublicData): Promise<void>
  $revoke(): Promise<void>
  $setPublicData(partial: Partial<PublicData>): Promise<void>
  $authorize(role?: string | string[]): void
}

// db is injected lazily so unit tests can swap in a fake and so importing this
// module never instantiates PrismaClient at import time.
let dbClient: any = null
export function __setDbForTests(fake: any) {
  dbClient = fake
}
function db() {
  if (!dbClient) dbClient = require("db").default
  return dbClient
}

function secretKey(): string {
  const key = process.env.SESSION_SECRET_KEY
  if (key) return key
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET_KEY is required")
  return "dev-secret"
}

const isSecure = () => process.env.NODE_ENV === "production"

type Req = IncomingMessage & { cookies?: Record<string, string>; method?: string; headers: any }
type Res = ServerResponse & { getHeader: any; setHeader: any }

export async function getSession(
  req: Req,
  res: Res,
  opts: { skipCsrf?: boolean } = {}
): Promise<SessionContext> {
  const cookies = req.cookies ?? {}
  const method = (req.method ?? "GET").toUpperCase()
  const csrfHeader = (req.headers["anti-csrf"] ?? "") as string

  // --- internal mutable state ------------------------------------------------
  let kind: "authenticated" | "anonymous" = "anonymous"
  let handle: string | null = null
  let antiCSRFToken = ""
  let publicData: Partial<PublicData> = {}
  let presentedCookie = false

  const setCookies = (extra: string[]) => {
    const existing = (res.getHeader("Set-Cookie") as string[] | string | undefined) ?? []
    const list = Array.isArray(existing) ? existing : [existing]
    // replace by cookie name so repeated writes don't stack duplicates
    const names = extra.map((c) => c.split("=")[0])
    const kept = list.filter((c) => !names.includes(c.split("=")[0]))
    res.setHeader("Set-Cookie", [...kept, ...extra])
  }

  const writeAnonymousCookies = () => {
    const payload: AnonymousPayload = {
      publicData: publicData as Record<string, unknown>,
      antiCSRFToken,
      issuedAt: Date.now(),
    }
    setCookies([
      serializeCookie(COOKIE_ANON, signAnonymousPayload(payload, secretKey()), {
        httpOnly: true,
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_CSRF, antiCSRFToken, { maxAgeMs: SESSION_TTL_MS, secure: isSecure() }),
      serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_SESSION, "", { expired: true, secure: isSecure() }),
    ])
  }

  const writeAuthenticatedCookies = (token: string) => {
    setCookies([
      serializeCookie(COOKIE_SESSION, token, {
        httpOnly: true,
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_CSRF, antiCSRFToken, { maxAgeMs: SESSION_TTL_MS, secure: isSecure() }),
      serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_ANON, "", { expired: true, secure: isSecure() }),
    ])
  }

  const expireAllCookies = () => {
    setCookies(
      [COOKIE_SESSION, COOKIE_ANON, COOKIE_CSRF, COOKIE_PUBLIC_DATA].map((name) =>
        serializeCookie(name, "", { expired: true, secure: isSecure() })
      )
    )
  }

  // --- 1. try DB-backed session ---------------------------------------------
  const parsed = parseSessionToken(cookies[COOKIE_SESSION])
  if (parsed) {
    presentedCookie = true
    const row = await db().session.findFirst({ where: { handle: parsed.handle } })
    if (
      row &&
      row.hashedSessionToken === hash256(parsed.secret) &&
      row.expiresAt &&
      row.expiresAt.getTime() > Date.now()
    ) {
      kind = "authenticated"
      handle = row.handle
      antiCSRFToken = row.antiCSRFToken ?? ""
      publicData = JSON.parse(row.publicData ?? "{}")
      // sliding refresh
      if (row.expiresAt.getTime() - Date.now() < REFRESH_AFTER_MS) {
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
        await db().session.update({ where: { handle: row.handle }, data: { expiresAt } })
        writeAuthenticatedCookies(makeSessionToken(parsed.handle, parsed.secret))
      }
    }
  }

  // --- 2. else try anonymous cookie ------------------------------------------
  if (kind === "anonymous" && cookies[COOKIE_ANON]) {
    presentedCookie = true
    const payload = verifyAnonymousPayload(cookies[COOKIE_ANON]!, secretKey())
    if (payload) {
      publicData = payload.publicData as Partial<PublicData>
      antiCSRFToken = payload.antiCSRFToken
    }
  }

  // --- 3. else fresh anonymous ------------------------------------------------
  if (kind === "anonymous" && !antiCSRFToken) {
    antiCSRFToken = generateToken(32)
    writeAnonymousCookies()
    presentedCookie = false // fresh — nothing valid was presented, CSRF not enforceable yet
  }

  // --- CSRF -------------------------------------------------------------------
  const csrfExempt =
    opts.skipCsrf === true || ["GET", "HEAD", "OPTIONS"].includes(method) || !presentedCookie
  if (!csrfExempt && csrfHeader !== antiCSRFToken) {
    throw new CSRFTokenMismatchError()
  }

  // --- context ----------------------------------------------------------------
  const session: SessionContext = {
    get userId() {
      return (publicData.userId as number | undefined) ?? null
    },
    get username() {
      return publicData.username
    },
    get role() {
      return publicData.role
    },
    get verified() {
      return publicData.verified
    },
    get verifyUserToken() {
      return publicData.verifyUserToken
    },

    async $create(newPublicData) {
      const newHandle = generateToken(32)
      const secret = generateToken(32)
      antiCSRFToken = generateToken(32)
      publicData = { ...newPublicData }
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      await db().session.create({
        data: {
          handle: newHandle,
          hashedSessionToken: hash256(secret),
          antiCSRFToken,
          publicData: JSON.stringify(publicData),
          expiresAt,
          user: { connect: { id: newPublicData.userId } },
        },
      })
      kind = "authenticated"
      handle = newHandle
      writeAuthenticatedCookies(makeSessionToken(newHandle, secret))
    },

    async $revoke() {
      if (kind === "authenticated" && handle) {
        await db().session.deleteMany({ where: { handle } })
      }
      kind = "anonymous"
      handle = null
      publicData = {}
      expireAllCookies()
    },

    async $setPublicData(partial) {
      publicData = { ...publicData, ...partial }
      if (kind === "authenticated" && handle) {
        await db().session.update({
          where: { handle },
          data: { publicData: JSON.stringify(publicData) },
        })
        setCookies([
          serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
            maxAgeMs: SESSION_TTL_MS,
            secure: isSecure(),
          }),
        ])
      } else {
        writeAnonymousCookies()
      }
    },

    $authorize(role) {
      if (!publicData.userId) throw new AuthenticationError()
      if (role !== undefined) {
        const allowed = ([] as string[]).concat(role)
        if (!allowed.includes(publicData.role ?? "")) throw new AuthorizationError()
      }
    },
  }

  return session
}
