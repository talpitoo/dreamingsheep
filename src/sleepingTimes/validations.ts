import { z } from "zod"

export const CreateSleepingTime = z.object({
  sleepingAt: z.string(),
  bedtime: z.string().nullable().optional(),
  wakeUpTime: z.string().nullable().optional(),
})

export const UpdateSleepingTime = z.object({
  id: z.number(),
  sleepingAt: z.string(),
  bedtime: z.string().nullable().optional(),
  wakeUpTime: z.string().nullable().optional(),
})
