import { resolver } from "@blitzjs/rpc"
import { NotFoundError } from "blitz"
import db from "db"
import { z } from "zod"

const GetSymbol = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
})

export default resolver.pipe(resolver.zod(GetSymbol), resolver.authorize(), async ({ id }) => {
  // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
  const symbol = await db.symbol.findFirst({ where: { id } })

  if (!symbol) throw new NotFoundError()

  return symbol
})
