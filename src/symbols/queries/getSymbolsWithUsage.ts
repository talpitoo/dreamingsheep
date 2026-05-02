import { resolver } from "@blitzjs/rpc"
import { Ctx, paginate } from "blitz"
import db, { Dream, Prisma, Role, Symbol, RecallTime, DreamTime, DreamType } from "db"

interface GetSymbolsInput extends Pick<Prisma.SymbolFindManyArgs, "skip" | "take"> {
  withUsageCount?: boolean
}

// Only include minimal dream data for symbol usage
interface DreamMinimal {
  id: number
  dreamAt: Date
  title: string
}

export interface SymbolWithUsage extends Symbol {
  occurrences: number
  dreams: DreamMinimal[]
}

export default resolver.pipe(
  resolver.authorize(),
  async ({ skip = 0, take = 100 }: GetSymbolsInput, ctx: Ctx) => {
    const userId = ctx.session.userId

    if (!userId) {
      return {
        symbols: [],
        nextPage: null,
        hasMore: false,
        count: 0,
      }
    }

    // Count all symbols for the user
    const count = await db.symbol.count({
      where: {
        OR: [{ relatedTo: { some: { id: userId } } }, { authorId: userId }],
      },
    })

    // Fetch all symbols for the user (we'll sort and paginate in memory)
    const symbols = await db.symbol.findMany({
      where: {
        OR: [{ relatedTo: { some: { id: userId } } }, { authorId: userId }],
      },
      include: {
        dreams: {
          where: { userId },
          select: {
            id: true,
            dreamAt: true,
            title: true,
          },
        },
      },
    })

    // Map to SymbolWithUsage and sort by occurrence count (descending)
    const symbolsWithUsage: SymbolWithUsage[] = symbols
      .map((symbol) => ({
        ...symbol,
        occurrences: symbol.dreams.length,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(skip, skip + take)

    return {
      symbols: symbolsWithUsage,
      nextPage: skip + take < count ? skip + take : null,
      hasMore: skip + take < count,
      count,
    }
  }
)
