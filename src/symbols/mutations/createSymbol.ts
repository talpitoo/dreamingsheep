import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { CreateSymbol } from "src/symbols/validations"
import { kebabCase } from "lodash/fp"

export default resolver.pipe(
  resolver.zod(CreateSymbol),
  resolver.authorize(),
  async (input, ctx: Ctx) => {
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const symbol = await db.symbol.create({
      data: {
        ...input,
        // set symbol code with userId
        code: kebabCase(input.name) + "-user-" + ctx.session.userId,
        author: {
          connect: { id: ctx.session.userId || undefined },
        },
      },
    })

    return symbol
  }
)
