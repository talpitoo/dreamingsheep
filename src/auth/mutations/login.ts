import { resolver } from "@blitzjs/rpc"
import { Login } from "../validations"
import { Role } from "types"
import { authenticateUser, generateVerifyUserToken } from "../utils"

export default resolver.pipe(resolver.zod(Login), async ({ email, password }, ctx) => {
  // This throws an error if credentials are invalid
  const user = await authenticateUser(email, password)

  if (!user.verified) {
    const verifyUserToken = await generateVerifyUserToken(user.id)
    await ctx.session.$setPublicData({
      username: user.username,
      verifyUserToken,
    })
  } else {
    await ctx.session.$create({
      userId: user.id,
      role: user.role as Role,
      username: user.username,
      verified: user.verified,
    })
  }

  return user
})
