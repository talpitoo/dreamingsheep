import { SecurePassword } from "src/auth/secure-password"
import { resolver } from "src/core/resolver"
import db, { User } from "db"
import { Signup } from "src/auth/validations"
import { kebabCase } from "lodash/fp"
import { generateVerifyUserToken } from "../utils"
import { createOtp } from "../utils/otp"
import axios from "axios"

export interface SignupQueueProps {
  email: User["email"]
  userId: number
  token: string
}

const signupQueue = async ({ email, userId, token }: SignupQueueProps) => {
  try {
    const code = await createOtp(userId)

    const baseUrl = process.env.WEB_APP_URL
    await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: "Long time no sleep?",
        template: "welcome",
        data: {
          name: email,
          code: code,
        },
      }),
    })

    console.log(`Signup email sent`)
  } catch (error) {
    console.log(error)
    console.error("Failed execute queue.")
  }
}

const verifyRecaptcha = async (token: string) => {
  const response = await axios.post(
    `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
  )
  const { success, score } = response.data
  console.log("reCAPTCHA verification response:", response.data)

  // return response.data.success // OLD
  // Set minimum threshold, e.g., 0.5. Adjust as needed based on testing.
  return success && score >= 0.5
}

// export default resolver.pipe(resolver.zod(Signup), async ({ email, password }, ctx) => {
export default resolver.pipe(
  resolver.zod(Signup),
  async ({ email, password, recaptchaToken }, ctx) => {
    const isHuman = await verifyRecaptcha(recaptchaToken)
    if (!isHuman) {
      throw new Error("Failed reCAPTCHA verification")
    }
    const hashedPassword = await SecurePassword.hash(password.trim())
    const maxId = await db.$queryRaw<[{ max: number }]>`
    SELECT MAX(id) FROM public."User" LIMIT 1
  `.then((res) => res[0].max + 1)

    const cleanEmail = email.toLowerCase().trim()
    const username = (cleanEmail.split("@")[0] as string).replace(/[^a-zA-Z\s:]/gi, "")

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        hashedPassword,
        username: kebabCase(`${username}-${maxId}`),
        verified: false,
      },
      select: { id: true, email: true, role: true, username: true },
    })

    const verifyUserToken = await generateVerifyUserToken(user.id)
    await ctx.session.$setPublicData({
      username: user.username,
      verifyUserToken,
    })

    await signupQueue({ email: user.email, userId: user.id, token: verifyUserToken })
    return user
  }
)
