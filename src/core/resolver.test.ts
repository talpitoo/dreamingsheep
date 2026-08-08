import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { resolver } from "./resolver"

const ctxWith = ($authorize = vi.fn()) => ({ session: { $authorize } } as any)

describe("resolver.pipe", () => {
  it("threads input through zod parse into the handler with ctx", async () => {
    const fn = resolver.pipe(
      resolver.zod(z.object({ n: z.number() })),
      async ({ n }, _ctx) => n * 2
    )
    expect(await fn({ n: 21 }, ctxWith())).toBe(42)
  })

  it("rejects invalid input via zod before the handler runs", async () => {
    const handler = vi.fn()
    const fn = resolver.pipe(resolver.zod(z.object({ n: z.number() })), handler)
    await expect(fn({ n: "nope" } as any, ctxWith())).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it("authorize() calls ctx.session.$authorize and passes input through", async () => {
    const $authorize = vi.fn()
    const fn = resolver.pipe(resolver.authorize(), async (input: any) => input)
    expect(await fn({ keep: true }, ctxWith($authorize))).toEqual({ keep: true })
    expect($authorize).toHaveBeenCalledWith(undefined)
  })

  it("authorize('ADMIN') forwards the role", async () => {
    const $authorize = vi.fn()
    await resolver.pipe(resolver.authorize("ADMIN"), async (i: any) => i)({}, ctxWith($authorize))
    expect($authorize).toHaveBeenCalledWith("ADMIN")
  })

  it("propagates $authorize throws (bare pipe without zod, like deleteUser)", async () => {
    const $authorize = vi.fn(() => {
      throw new Error("denied")
    })
    const fn = resolver.pipe(resolver.authorize(), async () => "never")
    await expect(fn(undefined, ctxWith($authorize))).rejects.toThrow("denied")
  })
})
