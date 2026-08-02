import { resolver } from "src/core/resolver"
import { NotFoundError } from "src/core/errors"
import db from "db"
import { z } from "zod"

const GetSymbol = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
})

export default resolver.pipe(resolver.zod(GetSymbol), resolver.authorize(), async ({ id }, ctx) => {
  // visible symbols: predefined ones and the user's own creations
  const symbol = await db.symbol.findFirst({
    // authorize() above guarantees a logged-in session
    where: { id, OR: [{ builtIn: true }, { authorId: ctx.session.userId! }] },
  })

  if (!symbol) throw new NotFoundError()

  return symbol
})
