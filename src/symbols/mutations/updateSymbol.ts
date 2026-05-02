import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateSymbol } from "src/symbols/validations"

export default resolver.pipe(
  resolver.zod(UpdateSymbol),
  resolver.authorize(),
  async ({ id, ...data }) => {
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const symbol = await db.symbol.update({ where: { id }, data })

    return symbol
  }
)
