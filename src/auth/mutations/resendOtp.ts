import { resolver } from "@blitzjs/rpc"
import db, { User } from "db"
import { DateTime, Duration } from "luxon"
import { UserVerifiedError, generateVerifyUserToken, validateVerifyUserToken } from "../utils"
import { createOtp } from "../utils/otp"

interface ResendOtpQueueProps {
  email: User["email"]
  userId: number
  token: string
}

const resendOtpQueue = async ({ email, userId, token }: ResendOtpQueueProps) => {
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
        subject: "Verification Code",
        template: "otp",
        data: {
          name: email,
          code: code,
        },
      }),
    })

    console.log(`Resend OTP email sent`)
  } catch (error) {
    console.log(error)
    console.error("Failed execute queue.")
  }
}

class TooManyRequestsError extends Error {
  name = "TooManyRequestsError"
  message =
    "You requested a new code recently, please wait an hour to request again or check your spam"
  constructor() {
    super()
  }
}

export default resolver.pipe(async (_, ctx) => {
  const user = await validateVerifyUserToken(ctx.session.username, ctx.session.verifyUserToken)

  if (!!user.verified) {
    throw new UserVerifiedError()
  }

  const lastOtp = await db.otp.findFirst({ where: { userId: user.id } })

  if (lastOtp) {
    // Create a Luxon DateTime object for the current time
    const now = DateTime.now()

    // Create a Luxon Duration object for one hour
    const duration = Duration.fromObject({ hours: 1 })

    // Subtract the duration from the current time
    const oneHourAgo = now.minus(duration)

    const targetDate = DateTime.fromJSDate(lastOtp.createdAt)

    if (targetDate > oneHourAgo) {
      throw new TooManyRequestsError()
    }
  }

  const verifyUserToken = await generateVerifyUserToken(user.id)
  await ctx.session.$setPublicData({
    username: user.username,
    verifyUserToken,
  })

  await resendOtpQueue({ email: user.email, userId: user.id, token: verifyUserToken })

  return true
})
