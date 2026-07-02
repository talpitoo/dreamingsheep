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
    // a user can only ever see predefined symbols and their own creations,
    // and only their own dreams inside the usage include
    const scopedWhere = {
      // authorize() above guarantees a logged-in session
      AND: [where, { OR: [{ builtIn: true }, { authorId: ctx.session.userId! }] }],
    }
    const {
      items: symbols,
      hasMore,
      nextPage,
      count,
    } = await paginate({
      skip,
      take,
      count: () => db.symbol.count({ where: scopedWhere }),
      query: async (paginateArgs) => {
        const collection = await db.symbol.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where: scopedWhere,
          orderBy,
          include: {
            dreams: {
              where: { userId: ctx.session.userId! },
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
