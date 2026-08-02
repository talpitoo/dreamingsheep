import type getDreamsResolver from "src/dreams/queries/getDreams"
import type getDreamResolver from "src/dreams/queries/getDream"
import type getDreamsByMonthResolver from "src/dreams/queries/getDreamsByMonth"
import type getDreamsGroupByResolver from "src/dreams/queries/getDreamsGroupBy"
import type createDreamResolver from "src/dreams/mutations/createDream"
import type updateDreamResolver from "src/dreams/mutations/updateDream"
import type deleteDreamResolver from "src/dreams/mutations/deleteDream"
import { rpcMutation, rpcQuery } from "src/core/rpc-client"

export const getDreams = rpcQuery<typeof getDreamsResolver>("getDreams")
export const getDream = rpcQuery<typeof getDreamResolver>("getDream")
export const getDreamsByMonth = rpcQuery<typeof getDreamsByMonthResolver>("getDreamsByMonth")
export const getDreamsGroupBy = rpcQuery<typeof getDreamsGroupByResolver>("getDreamsGroupBy")
export const createDream = rpcMutation<typeof createDreamResolver>("createDream")
export const updateDream = rpcMutation<typeof updateDreamResolver>("updateDream")
export const deleteDream = rpcMutation<typeof deleteDreamResolver>("deleteDream")
