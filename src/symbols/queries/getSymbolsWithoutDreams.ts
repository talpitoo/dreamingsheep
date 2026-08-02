import { resolver } from "src/core/resolver"
import db, { Prisma } from "db"

interface GetSymbolsWithoutDreamsInput
  extends Pick<Prisma.SymbolFindManyArgs, "where" | "orderBy"> {}

// used by the predefined-symbols picker on Settings — built-in symbols only,
// regardless of the client-supplied where (files in queries/ are public RPC endpoints!)
export default resolver.pipe(
  resolver.authorize(),
  async ({ where = {}, orderBy }: GetSymbolsWithoutDreamsInput) => {
    return await db.symbol.findMany({
      where: { AND: [where, { builtIn: true }] },
      orderBy: orderBy,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        code: true,
        name: true,
        description: true,
        picture: true,
        icon: true,
        builtIn: true,
        authorId: true,
        // Exclude the 'dreams' relationship here
      },
    })
  }
)
