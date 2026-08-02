import { afterEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import { rpcFetch, queryKeyFor, rpcQuery } from "./rpc-client"
import { AuthenticationError } from "./errors"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("rpcFetch", () => {
  it("POSTs superjson params with the anti-csrf header and revives Dates in results", async () => {
    const when = new Date("2026-08-02T12:00:00.000Z")
    const fetchMock = vi.fn(async (_url: any, _init: any) => ({
      ok: true,
      status: 200,
      text: async () => superjson.stringify({ result: { when } }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("document", { cookie: "dreamingsheep_sAntiCsrfToken=csrf-123" })

    const result = await rpcFetch("getDreams", { where: { dreamAt: { gte: when } } })
    expect(result.when instanceof Date).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/rpc/getDreams")
    expect(init.method).toBe("POST")
    expect(init.headers["anti-csrf"]).toBe("csrf-123")
    const sent = superjson.deserialize(JSON.parse(init.body)) as any
    expect(sent.where.dreamAt.gte instanceof Date).toBe(true)
  })

  it("rehydrates known error classes from error payloads", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 401,
      text: async () =>
        superjson.stringify({
          error: { name: "AuthenticationError", message: "nope", statusCode: 401 },
        }),
    }))
    vi.stubGlobal("document", { cookie: "" })
    await expect(rpcFetch("getCurrentUser", null)).rejects.toBeInstanceOf(AuthenticationError)
  })
})

describe("queryKeyFor", () => {
  it("is stable for equal params and distinct for different params", () => {
    const stub = rpcQuery("getDreams")
    const d = new Date("2026-01-01")
    expect(queryKeyFor(stub, { a: 1, when: d })).toEqual(queryKeyFor(stub, { a: 1, when: d }))
    expect(queryKeyFor(stub, { a: 1 })).not.toEqual(queryKeyFor(stub, { a: 2 }))
    expect(queryKeyFor(stub, null)[0]).toBe("getDreams")
  })
})
