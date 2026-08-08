import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import db, { Prisma } from "db"

interface GetSleepingTimeInput extends Pick<Prisma.SleepingTimeFindFirstArgs, "where"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {} }: GetSleepingTimeInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

    const sleepingTime = await db.sleepingTime.findFirst({
      where,
    })

    return sleepingTime
  }
)
