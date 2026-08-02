import { resolver } from "src/core/resolver"
import db from "db"
import { z } from "zod"

const DeleteDream = z.object({
  id: z.number(),
})

export default resolver.pipe(
  resolver.zod(DeleteDream),
  resolver.authorize(),
  async ({ id }, ctx) => {
    // scoped to the logged-in user — nobody deletes someone else's dream
    const dream = await db.dream.deleteMany({
      where: { id, userId: ctx.session.userId! },
    })

    return dream
  }
)
