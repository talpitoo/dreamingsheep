import { resolver } from "@blitzjs/rpc"
import { Ctx, paginate } from "blitz"
import db, { Prisma } from "db"

interface GetSymbolsInput
  extends Pick<Prisma.SymbolFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {}, orderBy, skip, take }: GetSymbolsInput, ctx: Ctx) => {
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
      query: (paginateArgs) =>
        db.symbol.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where,
          orderBy,
        }),
    })

    return {
      symbols,
      nextPage,
      hasMore,
      count,
    }
  }
)
