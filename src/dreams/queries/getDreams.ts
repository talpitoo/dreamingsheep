import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import { paginate } from "src/core/paginate"
import db, { Prisma } from "db"

interface GetDreamsInput
  extends Pick<Prisma.DreamFindManyArgs, "where" | "include" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {}, include = {}, orderBy, skip, take }: GetDreamsInput, ctx: Ctx) => {
    // ALWAYS scoped to the logged-in user — dreams are private, no exceptions
    // (the public homepage aggregates its stats server-side in gSSP instead)
    where["userId"] = ctx.session.userId
    const {
      items: dreams,
      hasMore,
      nextPage,
      count,
    } = await paginate({
      skip,
      take,
      count: () => db.dream.count({ where }),
      query: (paginateArgs) => {
        return db.dream.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where,
          orderBy,
          include: {
            ...include,
            symbols: include?.symbols ? include.symbols : true,
          },
        })
      },
    })

    return {
      dreams,
      nextPage,
      hasMore,
      count,
    }
  }
)
