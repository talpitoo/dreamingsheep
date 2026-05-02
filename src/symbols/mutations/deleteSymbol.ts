import { resolver } from "@blitzjs/rpc"
import db from "db"
import { DeleteSymbol } from "src/symbols/validations"

export default resolver.pipe(resolver.zod(DeleteSymbol), resolver.authorize(), async ({ id }) => {
  // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
  const symbol = await db.symbol.deleteMany({ where: { id } })

  return symbol
})
