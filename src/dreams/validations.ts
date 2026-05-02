import { z } from "zod"

const Symbol = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  builtIn: z.boolean().optional().default(false),
})

export const CreateDream = z.object({
  dreamAt: z.string(),
  title: z.string().refine(Boolean, "Required"),
  description: z.string(),
  type: z.enum([
    "REGULAR",
    "LUCID",
    "SLEEP_PARALYSIS",
    "HYPNOSIS",
    "DAYDREAM",
    "PSYCHEDELIC",
    "MEDITATION",
    "OTHER",
  ]),
  time: z.enum(["NIGHT", "MORNING", "AFTERNOON", "EVENING"]),
  recall: z.enum(["BLURRY", "N_A", "CLEAR"]),
  mood: z.number(),
  favorite: z.boolean(),
  symbols: z.array(Symbol).optional(),
})

export const UpdateDream = z.object({
  id: z.number(),
  title: z.string().refine(Boolean, "Required"),
  description: z.string(),
  type: z.enum([
    "REGULAR",
    "LUCID",
    "SLEEP_PARALYSIS",
    "HYPNOSIS",
    "DAYDREAM",
    "PSYCHEDELIC",
    "MEDITATION",
    "OTHER",
  ]),
  time: z.enum(["NIGHT", "MORNING", "AFTERNOON", "EVENING"]),
  recall: z.enum(["BLURRY", "N_A", "CLEAR"]),
  mood: z.number(),
  favorite: z.boolean(),
  symbols: z.array(Symbol).optional(),
})
