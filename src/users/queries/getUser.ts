import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import { NotFoundError } from "src/core/errors"
import db from "db"
import { z } from "zod"

const GetUser = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
})

export default resolver.pipe(
  resolver.zod(GetUser),
  resolver.authorize(),
  async ({ id }, ctx: Ctx) => {
    // users can only ever fetch THEMSELVES — the full row (incl. hashedPassword) must not cross users
    if (id !== ctx.session.userId) throw new NotFoundError()

    const user = await db.user.findFirst({
      where: { id },
      include: {
        relatedSymbols: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!user) throw new NotFoundError()

    return user
  }
)
