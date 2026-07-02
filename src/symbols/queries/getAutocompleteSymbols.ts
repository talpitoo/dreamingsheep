import { resolver } from "@blitzjs/rpc"
import { Ctx, paginate } from "blitz"
import db, { Prisma } from "db"

interface GetSymbolsInput
  extends Pick<Prisma.SymbolFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {}, orderBy, skip, take }: GetSymbolsInput, ctx: Ctx) => {
    // regardless of the client-supplied where, never expose other users' symbols
    const scopedWhere = {
      AND: [
        where,
        {
          OR: [
            { builtIn: true },
            // authorize() above guarantees a logged-in session
            { relatedTo: { some: { id: ctx.session.userId! } } },
            { authorId: ctx.session.userId! },
          ],
        },
      ],
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
      query: (paginateArgs) =>
        db.symbol.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where: scopedWhere,
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
