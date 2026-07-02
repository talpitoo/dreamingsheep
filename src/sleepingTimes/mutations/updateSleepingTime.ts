import { resolver } from "@blitzjs/rpc"
import { NotFoundError } from "blitz"
import db from "db"
import { UpdateSleepingTime } from "src/sleepingTimes/validations"

export default resolver.pipe(
  resolver.zod(UpdateSleepingTime),
  resolver.authorize(),
  async ({ id, ...data }, ctx) => {
    // scoped to the logged-in user
    const existing = await db.sleepingTime.findFirst({
      where: { id, userId: ctx.session.userId! },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError()

    const sleepTime = await db.sleepingTime.update({
      where: { id },
      data: { ...data },
    })

    return sleepTime
  }
)
