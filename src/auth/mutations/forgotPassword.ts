import { generateToken, hash256 } from "src/core/tokens"
import { resolver } from "src/core/resolver"
import db, { User } from "db"
import { ForgotPassword } from "../validations"

interface ResetPasswordQueueProps {
  email: User["email"]
  token: string
}

const resetPasswordQueue = async ({ email, token }: ResetPasswordQueueProps) => {
  try {
    const resetUrl = `${process.env.WEB_APP_URL}/reset-password?token=${token}`

    const baseUrl = process.env.WEB_APP_URL
    console.log(`[forgotPassword] Calling email API: ${baseUrl}/api/email/send`)
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: "Reset your password",
        template: "reset-password",
        data: {
          name: email,
          url: resetUrl,
        },
      }),
    })

    const result = await response.json()
    console.log(`[forgotPassword] Email API response:`, response.status, result)

    if (!response.ok) {
      throw new Error(`Email API failed: ${JSON.stringify(result)}`)
    }

    console.log(`Reset password email sent successfully`)
  } catch (error) {
    console.error("[forgotPassword] Failed to send email:", error)
    throw error // Re-throw so the error is visible
  }
}

const RESET_PASSWORD_TOKEN_EXPIRATION_IN_HOURS = 24

export default resolver.pipe(resolver.zod(ForgotPassword), async ({ email }) => {
  // 1. Get the user
  const user = await db.user.findFirst({ where: { email: email.toLowerCase() } })

  // 2. Generate the token and expiration date.
  const token = generateToken(32)
  const hashedToken = hash256(token)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + RESET_PASSWORD_TOKEN_EXPIRATION_IN_HOURS)

  // 3. If user with this email was found
  if (user) {
    // 4. Delete any existing password reset tokens
    await db.token.deleteMany({ where: { type: "RESET_PASSWORD", userId: user.id } })
    // 5. Save this new token in the database.
    await db.token.create({
      data: {
        user: { connect: { id: user.id } },
        type: "RESET_PASSWORD",
        expiresAt,
        hashedToken,
        sentTo: user.email,
      },
    })
    // 6. Send the email
    await resetPasswordQueue({ email: user.email, token })
  } else {
    // 7. If no user found wait the same time so attackers can't tell the difference
    await new Promise((resolve) => setTimeout(resolve, 750))
  }

  // 8. Return the same result whether a password reset email was sent or not
  return
})
