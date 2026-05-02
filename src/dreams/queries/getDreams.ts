import { resolver } from "@blitzjs/rpc"
import { Ctx, paginate } from "blitz"
import db, { Prisma } from "db"

interface GetDreamsInput
  extends Pick<Prisma.DreamFindManyArgs, "where" | "include" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  async ({ where = {}, include = {}, orderBy, skip, take }: GetDreamsInput, ctx: Ctx) => {
    if (ctx.session.$isAuthorized()) {
      where["userId"] = ctx.session.userId
    }
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
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
