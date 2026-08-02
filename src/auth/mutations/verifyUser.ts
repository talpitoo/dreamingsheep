import { resolver } from "src/core/resolver"
import db from "db"
import { VerifyUser } from "../validations"
import { Role } from "src/core/types"
import { UserVerifiedError, validateVerifyUserToken } from "../utils"
import getSymbols from "src/symbols/queries/getSymbols"

class VerifyUserError extends Error {
  name = "VerifyUserError"
  message = "OTP is invalid"
  constructor() {
    super()
  }
}

export default resolver.pipe(resolver.zod(VerifyUser), async ({ code }, ctx) => {
  const user = await validateVerifyUserToken(ctx.session.username, ctx.session.verifyUserToken)

  if (!!user.verified) {
    throw new UserVerifiedError()
  }

  const otp = await db.otp.findFirst({ where: { userId: user.id, code: code.trim() } })

  if (!otp) throw new VerifyUserError()

  await db.otp.delete({
    where: { userId: user.id },
  })

  await db.user.update({
    where: { id: user.id },
    data: { verified: true },
  })

  await ctx.session.$create({
    userId: user.id,
    role: user.role as Role,
    username: user.username,
    verified: user.verified,
  })

  await db.token.deleteMany({ where: { type: "VERIFY_USER", userId: user.id } })

  const { symbols } = await getSymbols({ where: { builtIn: true }, orderBy: { id: "asc" } }, ctx)
  const relatedSymbols = symbols.map((symbol) => ({ id: symbol.id }))

  await db.user.update({
    where: { id: user.id },
    data: { relatedSymbols: { set: relatedSymbols } },
    include: { relatedSymbols: true },
  })
})
