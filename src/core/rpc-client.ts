import {
  QueryClient,
  useMutation as useRQMutation,
  useQuery as useRQQuery,
} from "@tanstack/react-query"
import superjson from "superjson"
import { COOKIE_CSRF, readCookieValue } from "src/auth/session/public-data"
import { deserializeError } from "./errors"

// ---- stubs -------------------------------------------------------------------
export interface RpcStub<T = unknown> {
  key: string
  kind: "query" | "mutation"
  __type?: T
}
export type RpcInput<T> = T extends (input: infer I, ...rest: any[]) => any ? I : never
export type RpcResult<T> = T extends (...args: any[]) => Promise<infer R> ? R : never

export const rpcQuery = <T = unknown>(key: string): RpcStub<T> => ({ key, kind: "query" })
export const rpcMutation = <T = unknown>(key: string): RpcStub<T> => ({ key, kind: "mutation" })

// ---- query client (module-level: fixes the old created-inside-render smell) --
let queryClient: QueryClient | undefined
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: { queries: { suspense: true } },
    })
  }
  return queryClient
}

// ---- transport ---------------------------------------------------------------
export async function rpcFetch(key: string, params: unknown): Promise<any> {
  const res = await fetch(`/api/rpc/${key}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "anti-csrf": readCookieValue(COOKIE_CSRF),
    },
    body: superjson.stringify(params ?? null),
  })
  const text = await res.text()
  let payload: any = {}
  try {
    payload = text ? superjson.parse(text) : {}
  } catch {
    payload = {
      error: {
        name: "Error",
        message: `RPC ${key} failed (${res.status})`,
        statusCode: res.status,
      },
    }
  }
  // cookies may have rotated (login/logout/anonymous bootstrap) — nudge useSession
  notifySessionChanged()
  if (!res.ok || payload.error) throw deserializeError(payload.error)
  return payload.result
}

// session-store notification is injected by src/auth/client.ts to avoid an
// import cycle (auth/client imports nothing that imports it back)
let notifySessionChanged: () => void = () => undefined
export function __setSessionNotifier(fn: () => void) {
  notifySessionChanged = fn
}

// ---- hooks (Blitz-shaped) ----------------------------------------------------
export function queryKeyFor(stub: RpcStub<any>, params: unknown): [string, string] {
  return [stub.key, superjson.stringify(params ?? null)]
}

// SSR: do NOT suspend on the server — Next 16 static generation waits for
// suspended trees and would hang the build (Task 1 spike finding). Server-side,
// queries are disabled non-suspense renders (data undefined, no fetch); the
// AuthGuard keeps private page bodies off the server so nothing destructures
// undefined results there.
const isServer = typeof window === "undefined"

function queryOptions(options: any) {
  return isServer ? { ...options, enabled: false, suspense: false } : { suspense: true, ...options }
}

export function useQuery<T>(stub: RpcStub<T>, params: RpcInput<T>, options: any = {}) {
  const result = useRQQuery({
    queryKey: queryKeyFor(stub, params),
    queryFn: () => rpcFetch(stub.key, params),
    ...queryOptions(options),
  })
  return [result.data as RpcResult<T>, result] as const
}

export function usePaginatedQuery<T>(stub: RpcStub<T>, params: RpcInput<T>, options: any = {}) {
  const result = useRQQuery({
    queryKey: queryKeyFor(stub, params),
    queryFn: () => rpcFetch(stub.key, params),
    keepPreviousData: true,
    ...queryOptions(options),
  })
  return [result.data as RpcResult<T>, result] as const
}

export function useMutation<T>(stub: RpcStub<T>) {
  const mutation = useRQMutation({
    mutationFn: (input: RpcInput<T>) => rpcFetch(stub.key, input),
  })
  const invoke = (input?: RpcInput<T>) => mutation.mutateAsync(input as RpcInput<T>)
  return [invoke as (input?: RpcInput<T>) => Promise<RpcResult<T>>, mutation] as const
}

export function invalidateQuery(stub: RpcStub<any>) {
  return getQueryClient().invalidateQueries({ queryKey: [stub.key] })
}
