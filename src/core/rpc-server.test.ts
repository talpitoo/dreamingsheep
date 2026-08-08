import { describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import { NotFoundError } from "./errors"

// mock the registry with controlled resolvers BEFORE importing the handler
vi.mock("./rpc-registry", () => ({
  rpcRegistry: {
    echoDate: async (input: { when: Date }) => ({
      got: input.when,
      isDate: input.when instanceof Date,
    }),
    boom: async () => {
      throw new NotFoundError()
    },
  },
}))
// session: authenticated, CSRF satisfied — session internals are Task 6's tests
vi.mock("src/auth/session", () => ({
  getSession: vi.fn(async () => ({ userId: 7, $authorize: () => undefined })),
}))

import { handleRpc } from "./rpc-server"

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code
      return res
    },
    send(payload: any) {
      res.body = payload
      return res
    },
    json(payload: any) {
      res.body = JSON.stringify(payload)
      return res
    },
    end() {
      return res
    },
    setHeader() {},
    getHeader() {},
  }
  return res
}

describe("handleRpc", () => {
  it("dispatches with superjson-revived Dates and superjson-encodes the result", async () => {
    const when = new Date("2026-08-02T00:00:00.000Z")
    const req: any = {
      method: "POST",
      query: { endpoint: "echoDate" },
      body: JSON.parse(superjson.stringify({ when })),
      cookies: {},
      headers: {},
    }
    const res = fakeRes()
    await handleRpc(req, res)
    expect(res.statusCode).toBe(200)
    const parsed = superjson.parse(res.body) as any
    expect(parsed.result.isDate).toBe(true)
    expect(parsed.result.got.getTime()).toBe(when.getTime())
  })

  it("maps thrown errors to their statusCode with a serialized payload", async () => {
    const req: any = {
      method: "POST",
      query: { endpoint: "boom" },
      body: JSON.parse(superjson.stringify(null)),
      cookies: {},
      headers: {},
    }
    const res = fakeRes()
    await handleRpc(req, res)
    expect(res.statusCode).toBe(404)
    const parsed = superjson.parse(res.body) as any
    expect(parsed.error.name).toBe("NotFoundError")
  })

  it("404s unknown endpoints and 405s non-POST", async () => {
    const res1 = fakeRes()
    await handleRpc(
      { method: "POST", query: { endpoint: "nope" }, body: null, cookies: {}, headers: {} } as any,
      res1
    )
    expect(res1.statusCode).toBe(404)
    const res2 = fakeRes()
    await handleRpc(
      { method: "GET", query: { endpoint: "echoDate" }, cookies: {}, headers: {} } as any,
      res2
    )
    expect(res2.statusCode).toBe(405)
  })
})
