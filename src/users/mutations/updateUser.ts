import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import db from "db"
import { UpdateUser } from "src/users/validations"
import { Role } from "src/core/types"

export default resolver.pipe(
  resolver.zod(UpdateUser),
  resolver.authorize(),
  async ({ id: _clientSuppliedId, ...data }, ctx: Ctx) => {
    const { email, username, trackSleepingTime, advancedCharting } = data
    // the client-supplied id is deliberately ignored — users may only ever update THEMSELVES
    const user = await db.user.update({
      where: { id: ctx.session.userId! },
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
