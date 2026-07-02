import { describe, expect, it } from "vitest"
import { DreamTime, DreamType, RecallTime } from "db"
import { buildDreamSearchWhere, parseDreamSearchQuery } from "./buildDreamSearchWhere"

describe("buildDreamSearchWhere", () => {
  it("builds only the keyword clause for empty values (no phantom filters)", () => {
    const where = buildDreamSearchWhere({}) as any
    expect(where.AND).toHaveLength(1)
    expect(where.AND[0].OR[0].title.contains).toBeUndefined()
    expect(where.AND[0].OR[1].description.contains).toBeUndefined()
  })

  it("searches title AND description case-insensitively, unicode included", () => {
    const where = buildDreamSearchWhere({ q: "Zhuang Zhou 蝴蝶 🦄" }) as any
    expect(where.AND[0].OR[0].title).toEqual({
      contains: "Zhuang Zhou 蝴蝶 🦄",
      mode: "insensitive",
    })
    expect(where.AND[0].OR[1].description.contains).toBe("Zhuang Zhou 蝴蝶 🦄")
  })

  it("maps favorite TRUE/FALSE strings to booleans, empty string to no clause", () => {
    expect((buildDreamSearchWhere({ favorite: "TRUE" }) as any).AND).toContainEqual({
      favorite: true,
    })
    expect((buildDreamSearchWhere({ favorite: "FALSE" }) as any).AND).toContainEqual({
      favorite: false,
    })
    const where = buildDreamSearchWhere({ favorite: "" }) as any
    expect(where.AND.some((clause: any) => "favorite" in clause)).toBe(false)
  })

  it("adds `in` filters only for non-empty arrays", () => {
    const where = buildDreamSearchWhere({
      time: [DreamTime.NIGHT],
      mood: [],
      recall: [RecallTime.CLEAR, RecallTime.BLURRY],
      type: [],
    }) as any
    expect(where.AND).toContainEqual({ time: { in: [DreamTime.NIGHT] } })
    expect(where.AND).toContainEqual({ recall: { in: [RecallTime.CLEAR, RecallTime.BLURRY] } })
    expect(where.AND.some((clause: any) => "mood" in clause)).toBe(false)
    expect(where.AND.some((clause: any) => "type" in clause)).toBe(false)
  })

  it("filters symbols with a some/id/in relation clause", () => {
    const where = buildDreamSearchWhere({ symbolIds: [64, 65] }) as any
    expect(where.AND).toContainEqual({ symbols: { some: { id: { in: [64, 65] } } } })
  })
})

describe("parseDreamSearchQuery", () => {
  it("round-trips the exact URL format the Search page produces", () => {
    // this is how SearchPage encodes filters before pushing them to the URL
    const query = {
      q: encodeURI("dao 道"),
      favorite: encodeURI("TRUE"),
      time: encodeURI([DreamTime.NIGHT, DreamTime.MORNING].join(",")),
      mood: encodeURI([1, 5].join(",")),
      recall: encodeURI([RecallTime.CLEAR].join(",")),
      type: encodeURI([DreamType.LUCID].join(",")),
      symbols: encodeURI([64, 65].join(",")),
    }
    expect(parseDreamSearchQuery(query)).toEqual({
      q: "dao 道",
      favorite: "TRUE",
      time: [DreamTime.NIGHT, DreamTime.MORNING],
      mood: [1, 5],
      recall: [RecallTime.CLEAR],
      type: [DreamType.LUCID],
      symbolIds: [64, 65],
    })
  })

  it("returns empty arrays (not undefined) for absent params", () => {
    const values = parseDreamSearchQuery({})
    expect(values.q).toBeUndefined()
    expect(values.time).toEqual([])
    expect(values.mood).toEqual([])
    expect(values.symbolIds).toEqual([])
  })

  it("survives malformed percent-encoding instead of crashing the search page", () => {
    // regression: a hand-typed "?q=100%" used to throw URIError from decodeURI
    // and take the whole page down with it
    const values = parseDreamSearchQuery({ q: "100%", time: "%%%" })
    expect(values.q).toBe("100%")
    expect(values.time).toEqual(["%%%"])
  })

  it("documents current behavior: non-numeric mood/symbols params become NaN", () => {
    // hand-edited URLs are not sanitized; Prisma would reject NaN downstream
    const values = parseDreamSearchQuery({ mood: "abc", symbols: "1,oops" })
    expect(values.mood).toEqual([NaN])
    expect(values.symbolIds).toEqual([1, NaN])
  })
})
