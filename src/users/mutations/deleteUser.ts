import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"

export default resolver.pipe(resolver.authorize(), async (_, ctx: Ctx) => {
  try {
    const { userId } = ctx.session

    const dreams = db.dream.deleteMany({
      where: { userId: userId! },
    })

    const symbols = db.symbol.deleteMany({
      where: { authorId: userId! },
    })

    const user = db.user.delete({
      where: { id: userId! },
    })

    await db.$transaction([dreams, symbols, user])
    await ctx.session.$revoke()
    return true
  } catch (error) {
    console.log(error)
    return false
  }
})
