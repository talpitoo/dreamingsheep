import { describe, expect, it } from "vitest"
import { generateToken, hash256 } from "./tokens"

describe("tokens", () => {
  it("hash256 matches the recorded Blitz output (sha256 hex)", () => {
    // generated 2026-08-02 with @blitzjs/auth's hash256("sheep-fixture")
    expect(hash256("sheep-fixture")).toBe(
      "c0f03d7f57deb7c8f5f272f27fdb589763e7780ee989c15ebe608a9265b9eb04"
    )
  })
  it("hash256 of empty input is stable", () => {
    expect(hash256()).toBe(hash256(""))
  })
  it("generateToken returns url-safe strings of the requested length", () => {
    const t = generateToken(32)
    expect(t).toHaveLength(32)
    expect(t).toMatch(/^[A-Za-z0-9]+$/)
    expect(generateToken(32)).not.toBe(t)
  })
})
