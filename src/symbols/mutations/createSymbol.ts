import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { CreateSymbol } from "src/symbols/validations"
import { kebabCase } from "lodash/fp"

export default resolver.pipe(
  resolver.zod(CreateSymbol),
  resolver.authorize(),
  async (input, ctx: Ctx) => {
    const symbol = await db.symbol.create({
      data: {
        ...input,
        // user-created symbols are NEVER built-in, whatever the client claims
        builtIn: false,
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
