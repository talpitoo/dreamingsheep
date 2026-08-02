import { resolver } from "src/core/resolver"
import { NotFoundError } from "src/core/errors"
import db from "db"
import { UpdateDream } from "src/dreams/validations"

export default resolver.pipe(
  resolver.zod(UpdateDream),
  resolver.authorize(),
  async ({ id, ...data }, ctx) => {
    // scoped to the logged-in user — a foreign id must behave like a missing one
    const existing = await db.dream.findFirst({
      where: { id, userId: ctx.session.userId! },
      select: { id: true },
    })
    if (!existing) throw new NotFoundError()

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
