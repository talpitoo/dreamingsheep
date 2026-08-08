import type getSymbolResolver from "src/symbols/queries/getSymbol"
import type getSymbolsResolver from "src/symbols/queries/getSymbols"
import type getAutocompleteSymbolsResolver from "src/symbols/queries/getAutocompleteSymbols"
import type getSymbolsWithoutDreamsResolver from "src/symbols/queries/getSymbolsWithoutDreams"
import type getSymbolsWithUsageResolver from "src/symbols/queries/getSymbolsWithUsage"
import type createSymbolResolver from "src/symbols/mutations/createSymbol"
import type updateSymbolResolver from "src/symbols/mutations/updateSymbol"
import type deleteSymbolResolver from "src/symbols/mutations/deleteSymbol"
import { rpcMutation, rpcQuery } from "src/core/rpc-client"

export const getSymbol = rpcQuery<typeof getSymbolResolver>("getSymbol")
export const getSymbols = rpcQuery<typeof getSymbolsResolver>("getSymbols")
export const getAutocompleteSymbols =
  rpcQuery<typeof getAutocompleteSymbolsResolver>("getAutocompleteSymbols")
export const getSymbolsWithoutDreams =
  rpcQuery<typeof getSymbolsWithoutDreamsResolver>("getSymbolsWithoutDreams")
export const getSymbolsWithUsage =
  rpcQuery<typeof getSymbolsWithUsageResolver>("getSymbolsWithUsage")
export const createSymbol = rpcMutation<typeof createSymbolResolver>("createSymbol")
export const updateSymbol = rpcMutation<typeof updateSymbolResolver>("updateSymbol")
export const deleteSymbol = rpcMutation<typeof deleteSymbolResolver>("deleteSymbol")
