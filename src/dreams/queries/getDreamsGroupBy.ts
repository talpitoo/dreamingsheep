import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db, { Prisma } from "db"

interface GetDreamsInput extends Pick<Prisma.DreamGroupByArgs, "by" | "where"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ by = [], where = {} }: GetDreamsInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const dreams = await db.dream.groupBy({
      by,
      _count: {
        _all: true,
        mood: true,
      },
      where,
    })

    return dreams
  }
)
