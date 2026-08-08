import { describe, expect, it } from "vitest"
import { paginate } from "./paginate"

const makeArgs = (total: number) => ({
  count: async () => total,
  query: async ({ skip, take }: { skip: number; take: number }) =>
    // mirrors the resolver bodies: falsy take (Blitz's 0-default) means "no limit"
    Array.from(
      { length: take ? Math.min(take, Math.max(total - skip, 0)) : total - skip },
      (_, i) => skip + i
    ),
})

describe("paginate (exact Blitz beta.31 parity)", () => {
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

  it("REGRESSION: omitted take defaults to 0 = no limit — ExportDreams/stats fetch ALL rows", async () => {
    // Blitz's paginate defaults take=0 and the resolver bodies spread it falsily,
    // so a >250-dream journal must come back complete (the 250-cap truncated it)
    const r = await paginate({ ...makeArgs(300) })
    expect(r.items).toHaveLength(300)
    expect(r.count).toBe(300)
  })

  it("explicit take: 0 also means no limit (Blitz accepted zero)", async () => {
    const r = await paginate({ skip: 0, take: 0, ...makeArgs(300) })
    expect(r.items).toHaveLength(300)
  })

  it("passes take through to query even when 0 (resolver falsy-spread contract)", async () => {
    let seen: { skip: number; take: number } | null = null
    await paginate({
      count: async () => 1,
      query: async (args: { skip: number; take: number }) => {
        seen = args
        return []
      },
    })
    expect(seen).toEqual({ skip: 0, take: 0 })
  })

  it("enforces maxTake 250 on client-supplied take (Blitz abuse cap)", async () => {
    await expect(paginate({ skip: 0, take: 251, ...makeArgs(5) })).rejects.toThrow(/maxTake/)
    await expect(paginate({ skip: 0, take: 250, ...makeArgs(5) })).resolves.toBeTruthy()
  })

  it("rejects negative skip/take and non-integers, like Blitz", async () => {
    await expect(paginate({ skip: -1, take: 10, ...makeArgs(5) })).rejects.toThrow()
    await expect(paginate({ skip: 0, take: -1, ...makeArgs(5) })).rejects.toThrow()
    await expect(paginate({ skip: 0.5, take: 1, ...makeArgs(5) })).rejects.toThrow()
  })

  it("returns Blitz's full result shape (pageCount, from, to)", async () => {
    const r = await paginate({ skip: 10, take: 10, ...makeArgs(25) })
    expect(r.pageCount).toBe(3)
    expect(r.from).toBe(11)
    expect(r.to).toBe(20)
  })
})
