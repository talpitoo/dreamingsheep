import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db, { Prisma, Symbol } from "db"
import { GetSymbolsWithUsage } from "src/symbols/validations"
import { z } from "zod"

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

// visible symbols: built-ins the user opted into (relatedTo) + the user's own creations,
// or only the latter when customOnly is set (the "custom only" checkbox);
// occurrences only count the user's OWN dreams, which is why the ordering happens in SQL —
// Prisma 3 can't `orderBy` a filtered relation count (see issue #12)
const visibleSymbolsSql = (userId: number, customOnly: boolean) => Prisma.sql`
  FROM "Symbol" s
  LEFT JOIN "_DreamToSymbol" ds ON ds."B" = s."id"
  LEFT JOIN "Dream" d ON d."id" = ds."A" AND d."userId" = ${userId}
  WHERE s."authorId" = ${userId}
    OR (${!customOnly} AND EXISTS (SELECT 1 FROM "_SymbolToUser" su WHERE su."A" = s."id" AND su."B" = ${userId}))
  GROUP BY s."id"
`

export default resolver.pipe(
  resolver.zod(GetSymbolsWithUsage),
  resolver.authorize(),
  async (
    { skip, take, positionOfId, customOnly }: z.infer<typeof GetSymbolsWithUsage>,
    ctx: Ctx
  ) => {
    const userId = ctx.session.userId!

    // count, page and (optional) deep-link position share the same predicate and are
    // independent — one parallel batch instead of sequential roundtrips
    const [countRows, page, ranked] = await Promise.all([
      db.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS "count"
        FROM (SELECT s."id" ${visibleSymbolsSql(userId, customOnly)}) visible
      `,
      // only the current page leaves the database, sorted by per-user usage
      db.$queryRaw<{ id: number; occurrences: number }[]>`
        SELECT s."id", COUNT(d."id")::int AS "occurrences"
        ${visibleSymbolsSql(userId, customOnly)}
        ORDER BY "occurrences" DESC, s."id" ASC
        LIMIT ${take} OFFSET ${skip}
      `,
      positionOfId === undefined
        ? Promise.resolve<{ position: number }[]>([])
        : db.$queryRaw<{ position: number }[]>`
            SELECT "position" FROM (
              SELECT s."id", (ROW_NUMBER() OVER (ORDER BY COUNT(d."id") DESC, s."id" ASC))::int AS "position"
              ${visibleSymbolsSql(userId, customOnly)}
            ) ranked
            WHERE "id" = ${positionOfId}
          `,
    ])
    const count = countRows[0]?.count ?? 0
    const symbolPosition = positionOfId === undefined ? null : ranked[0]?.position ?? null

    // hydrate the page rows through Prisma to keep the exact shape the UI relies on
    const symbolRows = await db.symbol.findMany({
      where: { id: { in: page.map((row) => row.id) } },
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

    const symbolsById = new Map(symbolRows.map((symbol) => [symbol.id, symbol]))
    const symbols: SymbolWithUsage[] = page.flatMap((row) => {
      const symbol = symbolsById.get(row.id)
      return symbol ? [{ ...symbol, occurrences: row.occurrences }] : []
    })

    return {
      symbols,
      nextPage: skip + take < count ? skip + take : null,
      hasMore: skip + take < count,
      count,
      symbolPosition,
    }
  }
)
