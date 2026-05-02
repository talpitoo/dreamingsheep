import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db, { Prisma } from "db"

interface GetSleepingTimeInput extends Pick<Prisma.SleepingTimeFindFirstArgs, "where"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {} }: GetSleepingTimeInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const sleepingTime = await db.sleepingTime.findFirst({
      where,
    })

    return sleepingTime
  }
)
