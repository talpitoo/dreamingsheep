import type getCurrentUserResolver from "src/users/queries/getCurrentUser"
import type getUserResolver from "src/users/queries/getUser"
import type getUsersResolver from "src/users/queries/getUsers"
import type updateUserResolver from "src/users/mutations/updateUser"
import type deleteUserResolver from "src/users/mutations/deleteUser"
import { rpcMutation, rpcQuery } from "src/core/rpc-client"

export const getCurrentUser = rpcQuery<typeof getCurrentUserResolver>("getCurrentUser")
export const getUser = rpcQuery<typeof getUserResolver>("getUser")
export const getUsers = rpcQuery<typeof getUsersResolver>("getUsers")
export const updateUser = rpcMutation<typeof updateUserResolver>("updateUser")
export const deleteUser = rpcMutation<typeof deleteUserResolver>("deleteUser")
