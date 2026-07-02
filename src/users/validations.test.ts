import { describe, expect, it } from "vitest"
import { UpdateUser } from "./validations"

const VALID = {
  id: 2,
  email: "zhuangzi@dreamingsheep.net",
  username: "zhuangzi",
}

describe("UpdateUser", () => {
  it("defaults both opt-in flags to false when omitted", () => {
    const result = UpdateUser.parse(VALID)
    expect(result.trackSleepingTime).toBe(false)
    expect(result.advancedCharting).toBe(false)
  })

  it("rejects an empty username and malformed email", () => {
    expect(UpdateUser.safeParse({ ...VALID, username: "" }).success).toBe(false)
    expect(UpdateUser.safeParse({ ...VALID, email: "not-an-email" }).success).toBe(false)
  })

  it("accepts relatedSymbols as bare {id} objects and strips unknown fields", () => {
    const result = UpdateUser.parse({
      ...VALID,
      relatedSymbols: [{ id: 1, name: "smuggled extra field" }],
      role: "ADMIN", // not part of the schema -> must be stripped, not persisted
    })
    expect(result.relatedSymbols).toEqual([{ id: 1 }])
    expect("role" in result).toBe(false)
  })

  it("documents current behavior: the schema itself accepts an email change", () => {
    // the Settings UI disables the email field, but the mutation schema does not:
    // server-side that means an email update is schema-valid (no re-verification flow)
    expect(UpdateUser.safeParse({ ...VALID, email: "other@dreamingsheep.net" }).success).toBe(true)
  })
})
