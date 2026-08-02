import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import type { PublicData, SessionContext } from "src/auth/session"
import type { RouteUrlObject } from "src/routes"

export type Role = "ADMIN" | "USER"

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
