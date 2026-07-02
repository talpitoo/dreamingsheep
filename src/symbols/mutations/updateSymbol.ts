import { resolver } from "@blitzjs/rpc"
import { NotFoundError } from "blitz"
import db from "db"
import { UpdateSymbol } from "src/symbols/validations"

export default resolver.pipe(
  resolver.zod(UpdateSymbol),
  resolver.authorize(),
  async ({ id, ...data }, ctx) => {
    // only the author can edit a symbol; built-in symbols are untouchable,
    // and a user symbol can never be promoted to built-in
    const existing = await db.symbol.findFirst({
      where: { id, authorId: ctx.session.userId! },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError()

    const symbol = await db.symbol.update({ where: { id }, data: { ...data, builtIn: false } })

    return symbol
  }
)
