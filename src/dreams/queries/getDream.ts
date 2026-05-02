import { resolver } from "@blitzjs/rpc"
import { NotFoundError } from "blitz"
import db from "db"
import { z } from "zod"

const GetDream = z.object({
  // This accepts type of undefined, but is required at runtime
  id: z.number().optional().refine(Boolean, "Required"),
})

export default resolver.pipe(resolver.zod(GetDream), resolver.authorize(), async ({ id }) => {
  // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
  const dream = await db.dream.findFirst({
    where: { id },
    include: { symbols: { select: { name: true, code: true, id: true, builtIn: true } } },
  })

  if (!dream) throw new NotFoundError()

  return dream
})
