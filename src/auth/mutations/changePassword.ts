import { resolver } from "src/core/resolver"
import { SecurePassword } from "src/auth/secure-password"
import { ChangePassword } from "src/auth/validations"
import db from "db"
import { AuthenticationError, NotFoundError } from "src/core/errors"
import { authenticateUser } from "../utils"

class WrongCurrentPasswordError extends Error {
  name = "WrongCurrentPasswordError"
  constructor() {
    super()
  }
}

export default resolver.pipe(
  resolver.zod(ChangePassword),
  resolver.authorize(),
  async ({ currentPassword, password }, ctx) => {
    const user = await db.user.findFirst({ where: { id: ctx.session.userId! } })
    if (!user) throw new NotFoundError()

    try {
      await authenticateUser(user.email, currentPassword)
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw new WrongCurrentPasswordError()
      }
      throw error
    }

    const hashedPassword = await SecurePassword.hash(password.trim())
    await db.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    })

    return true
  }
)
