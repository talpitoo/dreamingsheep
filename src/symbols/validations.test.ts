import { describe, expect, it } from "vitest"
import { CreateSymbol, DeleteSymbol, UpdateSymbol } from "./validations"

describe("CreateSymbol", () => {
  it("requires a name but tolerates nullable description/picture/icon", () => {
    expect(
      CreateSymbol.safeParse({ name: "dao", code: "dao", description: null, icon: null }).success
    ).toBe(true)
    expect(CreateSymbol.safeParse({ name: "", code: "empty" }).success).toBe(false)
  })

  it("defaults builtIn to false so user symbols can never masquerade as predefined", () => {
    expect(CreateSymbol.parse({ name: "dao", code: "dao" }).builtIn).toBe(false)
  })

  it("accepts unicode/emoji names", () => {
    expect(CreateSymbol.safeParse({ name: "🦄 unicorn 独角兽", code: "unicorn-cn" }).success).toBe(
      true
    )
  })

  it("documents current behavior: an empty code passes the schema", () => {
    // code is unique in the DB; the schema itself does not require it non-empty
    expect(CreateSymbol.safeParse({ name: "dao", code: "" }).success).toBe(true)
  })
})

describe("UpdateSymbol / DeleteSymbol", () => {
  it("update requires builtIn explicitly (no default)", () => {
    expect(UpdateSymbol.safeParse({ id: 1, name: "dao", code: "dao" }).success).toBe(false)
    expect(
      UpdateSymbol.safeParse({ id: 1, name: "dao", code: "dao", builtIn: false }).success
    ).toBe(true)
  })

  it("delete requires a numeric id", () => {
    expect(DeleteSymbol.safeParse({ id: 64 }).success).toBe(true)
    expect(DeleteSymbol.safeParse({ id: "64" }).success).toBe(false)
  })
})
