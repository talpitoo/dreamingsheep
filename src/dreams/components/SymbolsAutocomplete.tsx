import { useQuery } from "@blitzjs/rpc"
import { useInstantDreamDialog } from "src/contexts/CreateInstantSymbolContext"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import getAutocompleteSymbols from "src/symbols/queries/getAutocompleteSymbols"
import { Symbol } from "db"
import React, { Fragment } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { Autocomplete, Box, Chip, createFilterOptions, TextField, FormLabel } from "@mui/material"

type PartialSymbol = Pick<Symbol, "name" | "code" | "id" | "icon" | "builtIn"> & {
  inputValue?: string
}

const filter = createFilterOptions<PartialSymbol>()
function label(options: Symbol[]): PartialSymbol[] {
  return options.map((sym) => ({
    ...sym,
  }))
}

export const SymbolsAutocomplete = () => {
  const user = useCurrentUser()
  const { setValues: setDialogValue, toggleDialog, state } = useInstantDreamDialog()
  const [, setCb] = state
  const [{ symbols }, { isLoading }] = useQuery(
    getAutocompleteSymbols,
    {
      orderBy: { name: "asc" },
      // NOTE: fix for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110
      // where: { OR: [{ relatedToId: user?.id }, { authorId: user?.id }] },
      where: { OR: [{ relatedTo: { some: { id: user?.id } } }, { authorId: user?.id }] },
      take: 200,
    },
    { queryKey: ["get-symbols-autocomplete"] }
  )

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
          freeSolo
          autoHighlight
          handleHomeEndKeys
          loading={isLoading}
          getOptionLabel={(option: PartialSymbol) => option.name}
          isOptionEqualToValue={(option: PartialSymbol, value: PartialSymbol) => {
            return option.id === value.id
          }}
          renderOption={(props, option) => (
            <Box component="li" sx={{ "& > span": { mr: 2, flexShrink: 0 } }} {...props}>
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
            if (params.inputValue !== "" && !isExisting) {
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
