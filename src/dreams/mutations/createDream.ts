import { resolver } from "@blitzjs/rpc"
import { Ctx } from "blitz"
import db from "db"
import { CreateDream } from "src/dreams/validations"

export default resolver.pipe(
  resolver.zod(CreateDream),
  resolver.authorize(),
  async (input, ctx: Ctx) => {
    const { symbols, ...data } = input
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const dream = await db.dream.create({
      data: {
        ...data,
        symbols: {
          connect: symbols?.map((sym) => ({ id: sym.id })),
        },
        user: {
          connect: { id: ctx.session.userId || undefined },
        },
      },
    })

    return dream
  }
)
