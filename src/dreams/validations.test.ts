import { describe, expect, it } from "vitest"
import { CreateDream, UpdateDream } from "./validations"

const VALID = {
  dreamAt: "2026-07-02T00:00:00.000Z",
  title: "The Butterfly Dream",
  description: "",
  type: "LUCID",
  time: "NIGHT",
  recall: "CLEAR",
  mood: 4,
  favorite: true,
}

describe("CreateDream", () => {
  it("accepts a minimal valid dream (empty description is fine)", () => {
    expect(CreateDream.safeParse(VALID).success).toBe(true)
  })

  it("rejects an empty title", () => {
    expect(CreateDream.safeParse({ ...VALID, title: "" }).success).toBe(false)
  })

  it("rejects values outside the type/time/recall enums", () => {
    expect(CreateDream.safeParse({ ...VALID, type: "NIGHTMARE" }).success).toBe(false)
    expect(CreateDream.safeParse({ ...VALID, time: "NOON" }).success).toBe(false)
    expect(CreateDream.safeParse({ ...VALID, recall: "PERFECT" }).success).toBe(false)
  })

  it("requires symbols to carry id, name and code when present", () => {
    expect(
      CreateDream.safeParse({ ...VALID, symbols: [{ id: 1, name: "dao", code: "dao" }] }).success
    ).toBe(true)
    expect(CreateDream.safeParse({ ...VALID, symbols: [{ id: 1 }] }).success).toBe(false)
  })

  it("documents current behavior: mood is an unbounded number", () => {
    // the UI only offers 1-5, but the schema accepts anything numeric —
    // worth tightening to z.number().int().min(1).max(5) someday
    expect(CreateDream.safeParse({ ...VALID, mood: 999 }).success).toBe(true)
    expect(CreateDream.safeParse({ ...VALID, mood: -1 }).success).toBe(true)
    expect(CreateDream.safeParse({ ...VALID, mood: 3.5 }).success).toBe(true)
    expect(CreateDream.safeParse({ ...VALID, mood: "3" }).success).toBe(false)
  })

  it("documents current behavior: dreamAt accepts any string, not just dates", () => {
    expect(CreateDream.safeParse({ ...VALID, dreamAt: "yesterday-ish" }).success).toBe(true)
  })
})

describe("UpdateDream", () => {
  it("requires a numeric id and keeps the same field rules", () => {
    const { dreamAt, ...rest } = VALID
    expect(UpdateDream.safeParse({ ...rest, id: 1 }).success).toBe(true)
    expect(UpdateDream.safeParse({ ...rest, id: "1" }).success).toBe(false)
    expect(UpdateDream.safeParse({ ...rest, id: 1, title: "" }).success).toBe(false)
  })
})
