import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteSymbol } from "src/symbols/validations"

export default resolver.pipe(
  resolver.zod(DeleteSymbol),
  resolver.authorize(),
  async ({ id }, ctx) => {
    // only the author can delete a symbol; built-in symbols (no author) are untouchable
    const symbol = await db.symbol.deleteMany({
      where: { id, authorId: ctx.session.userId! },
    })

    return symbol
  }
)
