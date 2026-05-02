import { z } from "zod"

const password = z.string().min(10).max(100)

// export const Signup = z.object({
//   email: z.string().email(),
//   password,
// })

export const Signup = z.object({
  email: z.string().email(),
  password,
  user_name: z.string().max(0, "Bots are not allowed"), // Honeypot field with max(0) to ensure it's empty
  recaptchaToken: z.string(),
})

export const Login = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const ForgotPassword = z.object({
  email: z.string().email(),
})

export const ResetPassword = z
  .object({
    password: password,
    passwordConfirmation: password,
    token: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "Passwords don't match",
    path: ["passwordConfirmation"], // set the path of the error
  })

export const ChangePassword = z
  .object({
    currentPassword: z.string().refine(Boolean, "Required"),
    password: password.refine(Boolean, "Required"),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.currentPassword !== data.password, {
    message: "new password can't be same with current password",
    path: ["password"],
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "passwords don't match",
    path: ["passwordConfirmation"],
  })

export const VerifyUser = z.object({
  code: z.string(),
})
