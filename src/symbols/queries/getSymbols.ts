import { resolver } from "@blitzjs/rpc"
import { Ctx, paginate } from "blitz"
import db, { Prisma } from "db"

interface GetSymbolsInput
  extends Pick<Prisma.SymbolFindManyArgs, "where" | "orderBy" | "skip" | "take"> {
  withUsageCount?: boolean
}

export default resolver.pipe(
  resolver.authorize(),
  async (
    { where = {}, orderBy, skip, take, withUsageCount = false }: GetSymbolsInput,
    ctx: Ctx
  ) => {
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const {
      items: symbols,
      hasMore,
      nextPage,
      count,
    } = await paginate({
      skip,
      take,
      count: () => db.symbol.count({ where }),
      query: async (paginateArgs) => {
        const collection = await db.symbol.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where,
          orderBy,
          include: {
            dreams: {
              select: { description: true, id: true },
            },
            _count: { select: { dreams: true } },
          },
        })

        if (!withUsageCount) {
          return collection
        }

        return collection.filter((item) => Number(item._count?.dreams) > 0)
      },
    })

    return {
      symbols,
      nextPage,
      hasMore,
      count,
    }
  }
)
