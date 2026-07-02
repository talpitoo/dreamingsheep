import { describe, expect, it } from "vitest"
import { ChangePassword, ForgotPassword, Login, ResetPassword, Signup } from "./validations"

const VALID_SIGNUP = {
  email: "zhuangzi@dreamingsheep.net",
  password: "butterfly-dream",
  user_name: "", // honeypot must stay empty
  recaptchaToken: "token",
}

describe("Signup", () => {
  it("accepts a valid human signup", () => {
    expect(Signup.safeParse(VALID_SIGNUP).success).toBe(true)
  })

  it("rejects bots that fill the user_name honeypot", () => {
    const result = Signup.safeParse({ ...VALID_SIGNUP, user_name: "Totally A Human" })
    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues[0]?.message).toBe("Bots are not allowed")
  })

  it("enforces password length 10-100", () => {
    expect(Signup.safeParse({ ...VALID_SIGNUP, password: "short-123" }).success).toBe(false) // 9
    expect(Signup.safeParse({ ...VALID_SIGNUP, password: "long-enough" }).success).toBe(true) // 11
    expect(Signup.safeParse({ ...VALID_SIGNUP, password: "x".repeat(101) }).success).toBe(false)
  })

  it("rejects malformed emails", () => {
    expect(Signup.safeParse({ ...VALID_SIGNUP, email: "meh@" }).success).toBe(false)
    expect(Signup.safeParse({ ...VALID_SIGNUP, email: "meh at sheep" }).success).toBe(false)
  })
})

describe("Login / ForgotPassword", () => {
  it("login accepts any non-length-checked password but validates the email", () => {
    expect(Login.safeParse({ email: "meh@dreamingsheep.net", password: "x" }).success).toBe(true)
    expect(Login.safeParse({ email: "nope", password: "x" }).success).toBe(false)
  })

  it("forgot-password validates the email", () => {
    expect(ForgotPassword.safeParse({ email: "meh@dreamingsheep.net" }).success).toBe(true)
    expect(ForgotPassword.safeParse({ email: "" }).success).toBe(false)
  })
})

describe("ResetPassword", () => {
  it("rejects mismatched confirmations and points at the confirmation field", () => {
    const result = ResetPassword.safeParse({
      password: "new-password-1",
      passwordConfirmation: "new-password-2",
      token: "token",
    })
    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues[0]?.path).toEqual(["passwordConfirmation"])
  })
})

describe("ChangePassword", () => {
  const valid = {
    currentPassword: "old-password-1",
    password: "new-password-1",
    passwordConfirmation: "new-password-1",
  }

  it("accepts a proper change", () => {
    expect(ChangePassword.safeParse(valid).success).toBe(true)
  })

  it("rejects reusing the current password", () => {
    const result = ChangePassword.safeParse({
      ...valid,
      password: valid.currentPassword,
      passwordConfirmation: valid.currentPassword,
    })
    expect(result.success).toBe(false)
    expect(!result.success && result.error.issues[0]?.path).toEqual(["password"])
  })

  it("rejects a too-short new password even when confirmations match", () => {
    const result = ChangePassword.safeParse({
      ...valid,
      password: "short-123",
      passwordConfirmation: "short-123",
    })
    expect(result.success).toBe(false)
  })
})
