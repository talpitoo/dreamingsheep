import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { CreateSleepingTime } from "src/sleepingTimes/validations"

export default resolver.pipe(
  resolver.zod(CreateSleepingTime),
  resolver.authorize(),
  async (input, ctx: Ctx) => {
    const { ...data } = input
    const sleepTime = await db.sleepingTime.create({
      data: {
        ...data,
        user: {
          connect: { id: ctx.session.userId || undefined },
        },
      },
    })

    return sleepTime
  }
)
