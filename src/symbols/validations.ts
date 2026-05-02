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

export const UpdateSymbol = z.object({
  id: z.number(),
  name: z.string().refine(Boolean, "Required"),
  code: z.string(),
  description: z.string().nullable().optional(),
  picture: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  builtIn: z.boolean(),
})
