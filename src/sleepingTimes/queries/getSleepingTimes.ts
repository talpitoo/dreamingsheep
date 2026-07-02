import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db, { Prisma } from "db"

interface GetSleepingTimesInput
  extends Pick<Prisma.SleepingTimeFindManyArgs, "where" | "orderBy"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {}, orderBy }: GetSleepingTimesInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

    const sleepingTimes = await db.sleepingTime.findMany({
      where,
      orderBy,
    })

    return sleepingTimes
  }
)
