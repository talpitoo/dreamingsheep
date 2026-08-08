import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import type { PublicData, SessionContext } from "src/auth/session"
import type { RouteUrlObject } from "src/routes"

// mirrors the Prisma `Role` enum (USER | ADMIN | DEMO). The Blitz-era type
// omitted DEMO — widened post-migration (PR #31 review) so the union matches
// the DB truth; purely type-level, no runtime behavior change.
export type Role = "ADMIN" | "USER" | "DEMO"

export interface Ctx {
  session: SessionContext
}

export type { PublicData, SessionContext }

export type AppPage<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
  authenticate?: boolean
  redirectAuthenticatedTo?: RouteUrlObject | (() => RouteUrlObject)
  suppressFirstRenderFlicker?: boolean
}
