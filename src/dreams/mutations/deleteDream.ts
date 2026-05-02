import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"

const DeleteDream = z.object({
  id: z.number(),
})

export default resolver.pipe(resolver.zod(DeleteDream), resolver.authorize(), async ({ id }) => {
  // TODO @pastcontributor double-check: in multi-tenant app, you must add validation to ensure correct tenant
  const dream = await db.dream.deleteMany({ where: { id } })

  return dream
})
