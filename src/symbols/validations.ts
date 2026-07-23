import { z } from "zod"

export const CreateSymbol = z.object({
  name: z.string().refine(Boolean, "Required"),
  code: z.string(),
  description: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  builtIn: z.boolean().optional().default(false),
})

export const DeleteSymbol = z.object({
  id: z.number(),
})

export const GetSymbolsWithUsage = z.object({
  skip: z.number().int().nonnegative().optional().default(0),
  take: z.number().int().positive().max(100).optional().default(100),
  // deep links from a dream only carry the symbol id — when set, the query also
  // returns that symbol's 1-based position so the client can jump to its page
  positionOfId: z.number().int().optional(),
  // hide the opted-in predefined/built-in symbols, keeping only the user's own creations
  customOnly: z.boolean().optional().default(false),
})

export const UpdateSymbol = z.object({
  id: z.number(),
  name: z.string().refine(Boolean, "Required"),
  code: z.string(),
  description: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  builtIn: z.boolean(),
})
