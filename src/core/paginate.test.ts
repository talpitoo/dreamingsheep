import { describe, expect, it } from "vitest"
import { paginate } from "./paginate"

const makeArgs = (total: number) => ({
  count: async () => total,
  query: async ({ skip, take }: { skip: number; take: number }) =>
    Array.from({ length: Math.min(take, Math.max(total - skip, 0)) }, (_, i) => skip + i),
})

describe("paginate", () => {
  it("returns items, count, hasMore and nextPage mid-list", async () => {
    const r = await paginate({ skip: 0, take: 10, ...makeArgs(25) })
    expect(r.items).toHaveLength(10)
    expect(r.count).toBe(25)
    expect(r.hasMore).toBe(true)
    expect(r.nextPage).toEqual({ skip: 10, take: 10 })
  })
  it("last page has hasMore false and nextPage null", async () => {
    const r = await paginate({ skip: 20, take: 10, ...makeArgs(25) })
    expect(r.items).toHaveLength(5)
    expect(r.hasMore).toBe(false)
    expect(r.nextPage).toBeNull()
  })
  it("defaults skip=0 take=250 (Blitz defaults) when omitted", async () => {
    const r = await paginate({ ...makeArgs(3) })
    expect(r.items).toHaveLength(3)
    expect(r.hasMore).toBe(false)
  })
  it("rejects negative skip / non-positive take", async () => {
    await expect(paginate({ skip: -1, take: 10, ...makeArgs(5) })).rejects.toThrow()
    await expect(paginate({ skip: 0, take: 0, ...makeArgs(5) })).rejects.toThrow()
  })
})
