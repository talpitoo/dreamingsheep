import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { UpdateUser } from "src/users/validations"
import { Role } from "types"

export default resolver.pipe(
  resolver.zod(UpdateUser),
  resolver.authorize(),
  async ({ id, ...data }, ctx: Ctx) => {
    const { email, username, trackSleepingTime, advancedCharting } = data
    const user = await db.user.update({
      where: { id },
      data: {
        email,
        username,
        trackSleepingTime,
        advancedCharting,
        relatedSymbols: {
          set: data.relatedSymbols,
        },
      },
      include: { relatedSymbols: true },
    })

    await ctx.session.$setPublicData({ role: user.role as Role, username: user.username })

    return user
  }
)
