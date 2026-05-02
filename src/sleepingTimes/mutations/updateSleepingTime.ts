import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { UpdateSleepingTime } from "src/sleepingTimes/validations"

export default resolver.pipe(
  resolver.zod(UpdateSleepingTime),
  resolver.authorize(),
  async ({ id, ...data }) => {
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const sleepTime = await db.sleepingTime.update({
      where: { id },
      data: { ...data },
    })

    return sleepTime
  }
)
