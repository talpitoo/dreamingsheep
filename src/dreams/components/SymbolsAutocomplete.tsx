import { getQueryClient, useQuery } from "src/core/rpc-client"
import { useInstantDreamDialog } from "src/contexts/CreateInstantSymbolContext"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import { useOnlineStatus } from "src/core/offline/onlineStatus"
import { AUTOCOMPLETE_SYMBOLS_QUERY_KEY } from "src/core/offline/persistedQueries"
import { getAutocompleteSymbols } from "src/symbols/client"
import { Symbol } from "db"
import React, { Fragment } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { Autocomplete, Box, Chip, createFilterOptions, TextField, FormLabel } from "@mui/material"
import classnames from "src/utils/classnames"

type PartialSymbol = Pick<Symbol, "name" | "code" | "id" | "icon" | "builtIn"> & {
  inputValue?: string
}

const filter = createFilterOptions<PartialSymbol>()
function label(options: Symbol[]): PartialSymbol[] {
  return options.map((sym) => ({
    ...sym,
  }))
}

// allowCreate: only the dream create/edit form may offer the `Add "…"` instant-symbol
// option; the search/stats filter panels pick from existing symbols only
// the picker's query, shared with DreamsPage's once-per-session prefetch: the picker sits behind
// the form's "More" and fetches only when opened, so without the prefetch a device whose user never
// opened it online would have no symbols to attach offline
export function autocompleteSymbolsParams(userId: number | undefined) {
  return {
    orderBy: { name: "asc" as const },
    // NOTE: fix for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110
    // where: { OR: [{ relatedToId: userId }, { authorId: userId }] },
    where: { OR: [{ relatedTo: { some: { id: userId } } }, { authorId: userId }] },
    take: 200,
  }
}

export const SymbolsAutocomplete = ({ allowCreate = false }: { allowCreate?: boolean }) => {
  const user = useCurrentUser()
  const online = useOnlineStatus()
  const { setValues: setDialogValue, toggleDialog, state } = useInstantDreamDialog()
  const [, setCb] = state
  // the explicit key (not the stub's) is what CreateInstantSymbolDialog refetches after a create
  const queryKey = [AUTOCOMPLETE_SYMBOLS_QUERY_KEY]
  const hasCached = !!getQueryClient().getQueryData(queryKey)
  // offline and never cached on this device, the query stays disabled: no data, no suspense and
  // isLoading stuck at true — the picker renders empty (not "Loading…") instead of crashing
  const [symbolsResult, { isLoading }] = useQuery(
    getAutocompleteSymbols,
    autocompleteSymbolsParams(user?.id),
    { queryKey, enabled: online || hasCached }
  )
  const symbols = symbolsResult?.symbols ?? []
  // creating a symbol needs the server: offline, only existing symbols (real ids) can be attached
  const canCreate = allowCreate && online

  const { control } = useFormContext()

  return (
    <Controller
      name="symbols"
      control={control}
      render={({ field }) => (
        <Autocomplete
          multiple
          value={field.value}
          id="tags-filled"
          options={label(symbols)}
          freeSolo={canCreate}
          autoHighlight
          handleHomeEndKeys
          loading={isLoading && online}
          getOptionLabel={(option: PartialSymbol) => option.name}
          isOptionEqualToValue={(option: PartialSymbol, value: PartialSymbol) => {
            return option.id === value.id
          }}
          renderOption={(props, option) => (
            // props carries MUI's own className for the option, so spread it FIRST and merge —
            // otherwise the spread silently overwrites ours (sx survived here only because props
            // has no sx to clobber it with)
            <Box
              component="li"
              {...props}
              className={classnames("[&>span]:mr-4 [&>span]:shrink-0", props.className)}
            >
              {option.icon ? (
                <span className={option.icon} />
              ) : (
                <span className="lucidicon lucidicon-tag"></span>
              )}
              {option.name}
            </Box>
          )}
          renderTags={(value: readonly PartialSymbol[], getTagProps) =>
            value.filter(Boolean).map((option: PartialSymbol, index: number) => (
              // eslint-disable-next-line react/jsx-key
              <Chip
                size="medium"
                icon={
                  option.icon ? (
                    <span className={option.icon} />
                  ) : (
                    <span className="lucidicon lucidicon-tag"></span>
                  )
                }
                variant="outlined"
                label={option.name}
                {...getTagProps({ index })}
              />
            ))
          }
          onChange={(event, newValue) => {
            if (newValue && (newValue as PartialSymbol[])[newValue.length - 1]?.inputValue) {
              toggleDialog(true)
              setDialogValue({
                name: (newValue as PartialSymbol[])[newValue.length - 1]!.inputValue!,
                description: "",
                code: "",
              })
              setCb(() => (symbol: Symbol) => {
                field.onChange([...field.value, symbol])
              })
            } else {
              field.onChange(newValue)
            }
          }}
          filterSelectedOptions
          filterOptions={(options, params) => {
            const filtered = filter(options, params)

            const isExisting = options.some((option) => params.inputValue === option.name)
            if (canCreate && params.inputValue !== "" && !isExisting) {
              // @ts-expect-error type mismatch
              filtered.push({ inputValue: params.inputValue, name: `Add "${params.inputValue}"` })
            }

            return filtered
          }}
          renderInput={(params) => (
            <Fragment>
              <FormLabel>symbols (themes, characters, setting, etc.)</FormLabel>
              <TextField {...params} placeholder="type to search symbols..." />
            </Fragment>
          )}
        />
      )}
    />
  )
}

export default SymbolsAutocomplete
