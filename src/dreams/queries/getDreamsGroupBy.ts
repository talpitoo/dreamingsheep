import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import db, { Prisma } from "db"

interface GetDreamsInput extends Pick<Prisma.DreamGroupByArgs, "by" | "where"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ by = [], where = {} }: GetDreamsInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

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
