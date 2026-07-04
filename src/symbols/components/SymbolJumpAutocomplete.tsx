import { useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import { Routes } from "@blitzjs/next"
import { Autocomplete, Box, Paper, TextField } from "@mui/material"
import { Symbol } from "db"
import React from "react"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import getAutocompleteSymbols from "src/symbols/queries/getAutocompleteSymbols"

// quick jump on the paginated Symbols page: picking a symbol navigates to
// /symbols?id=<id>, which resolves its page and expands the card — the same
// flow as following a symbol link from a dream
export const SymbolJumpAutocomplete = () => {
  const user = useCurrentUser()
  const router = useRouter()
  const [{ symbols }, { isLoading }] = useQuery(
    getAutocompleteSymbols,
    {
      orderBy: { name: "asc" },
      where: { OR: [{ relatedTo: { some: { id: user?.id } } }, { authorId: user?.id }] },
      take: 200,
    },
    { queryKey: ["get-symbols-autocomplete"] }
  )

  return (
    <Paper sx={{ mb: 7, p: 1 }}>
      <Autocomplete
        options={symbols as Symbol[]}
        autoHighlight
        handleHomeEndKeys
        loading={isLoading}
        // stays empty after a pick — it's a navigation box, not a filter
        value={null}
        blurOnSelect
        clearOnBlur
        forcePopupIcon={false}
        getOptionLabel={(option: Symbol) => option.name}
        isOptionEqualToValue={(option: Symbol, value: Symbol) => option.id === value.id}
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
        onChange={(_, symbol) => {
          if (symbol) {
            // scroll: false — the SymbolCard smooth-scrolls itself into view; the default
            // scroll-to-top would stomp it when the symbol is already on the current page
            router.push(Routes.SymbolsPage({ id: symbol.id }), undefined, { scroll: false })
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="type to find a symbol..."
            variant="standard"
            InputProps={{ ...params.InputProps, disableUnderline: true }}
          />
        )}
      />
    </Paper>
  )
}

export default SymbolJumpAutocomplete
