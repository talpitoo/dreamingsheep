import type getSleepingTimeResolver from "src/sleepingTimes/queries/getSleepingTime"
import type getSleepingTimesResolver from "src/sleepingTimes/queries/getSleepingTimes"
import type createSleepingTimeResolver from "src/sleepingTimes/mutations/createSleepingTime"
import type updateSleepingTimeResolver from "src/sleepingTimes/mutations/updateSleepingTime"
import { rpcMutation, rpcQuery } from "src/core/rpc-client"

export const getSleepingTime = rpcQuery<typeof getSleepingTimeResolver>("getSleepingTime")
export const getSleepingTimes = rpcQuery<typeof getSleepingTimesResolver>("getSleepingTimes")
export const createSleepingTime =
  rpcMutation<typeof createSleepingTimeResolver>("createSleepingTime")
export const updateSleepingTime =
  rpcMutation<typeof updateSleepingTimeResolver>("updateSleepingTime")
