import { Ctx } from "src/core/types"

export default async function logout(_: any, ctx: Ctx) {
  return await ctx.session.$revoke()
}
