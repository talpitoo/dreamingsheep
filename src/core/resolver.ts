import type { z } from "zod"

// Minimal reimplementation of @blitzjs/rpc's resolver with identical runtime
// semantics for the three helpers this codebase uses: pipe, zod, authorize.
// Resolver files keep their bodies untouched — only the import line changes.

type Step = (input: any, ctx: any) => any

function pipe(...fns: Step[]) {
  return async (input: any, ctx: any) => {
    let acc = input
    for (const fn of fns) {
      acc = await fn(acc, ctx)
    }
    return acc
  }
}

function zod<S extends z.ZodType<any, any>>(schema: S) {
  return (input: z.input<S>): z.output<S> => schema.parse(input)
}

function authorize(role?: string | string[]) {
  return (input: any, ctx: any) => {
    ctx.session.$authorize(role)
    return input
  }
}

export const resolver = { pipe, zod, authorize }
