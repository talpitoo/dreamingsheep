import { z } from "zod"

const Symbol = z.object({
  id: z.number(),
  // code: z.string(),
  // name: z.string(),
  // description: z.string(),
  // picture: z.string().nullable(),
  // icon: z.string().nullable(),
  // builtIn: z.boolean(),
})

export const UpdateUser = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().refine(Boolean, "Required"),
  relatedSymbols: z.array(Symbol).optional(),
  trackSleepingTime: z.boolean().default(false),
})
