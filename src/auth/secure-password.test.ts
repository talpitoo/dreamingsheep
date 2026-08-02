import { describe, expect, it } from "vitest"
import { SecurePassword } from "./secure-password"
import { AuthenticationError } from "src/core/errors"

// generated 2026-08-02 with @blitzjs/auth/secure-password's SecurePassword.hash("zhuangzi")
const BLITZ_HASH =
  "JGFyZ29uMmlkJHY9MTkkbT02NTUzNix0PTIscD0xJEliM2RHc0N1bzZSUzVEWk5IMEVmZkEkUzFsWktyZk1qcWp3RVBIUTMyWmlRbUl6cENLRnptRUhUcUVqZUU3ZWtxNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

describe("SecurePassword", () => {
  it("verifies a hash produced by the Blitz wrapper (no password resets!)", async () => {
    const result = await SecurePassword.verify(BLITZ_HASH, "zhuangzi")
    expect([SecurePassword.VALID, SecurePassword.VALID_NEEDS_REHASH]).toContain(result)
  })
  it("round-trips its own hashes", async () => {
    const hashed = await SecurePassword.hash("Password_123")
    expect(await SecurePassword.verify(hashed, "Password_123")).toBe(SecurePassword.VALID)
  })
  it("throws AuthenticationError on a wrong password", async () => {
    const hashed = await SecurePassword.hash("right")
    await expect(SecurePassword.verify(hashed, "wrong")).rejects.toBeInstanceOf(AuthenticationError)
  })
  it("throws AuthenticationError on empty input", async () => {
    await expect(SecurePassword.hash("")).rejects.toBeInstanceOf(AuthenticationError)
    await expect(SecurePassword.verify(null, "x")).rejects.toBeInstanceOf(AuthenticationError)
  })
})
