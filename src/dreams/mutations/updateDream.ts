import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateDream } from "src/dreams/validations"

export default resolver.pipe(
  resolver.zod(UpdateDream),
  resolver.authorize(),
  async ({ id, ...data }) => {
    // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
    const dream = await db.dream.update({
      where: { id },
      data: {
        ...data,
        symbols: {
          set: data.symbols?.map((sym) => ({ id: sym.id })),
        },
      },
      include: { symbols: { select: { name: true, code: true, id: true, builtIn: true } } },
    })

    return dream
  }
)
