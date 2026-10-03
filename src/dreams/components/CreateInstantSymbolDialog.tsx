import Image from "next/image"
import { useMutation } from "src/core/rpc-client"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  TextField,
  Box,
} from "@mui/material"
import { useInstantDreamDialog } from "src/contexts/CreateInstantSymbolContext"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import { useOnlineStatus } from "src/core/offline/onlineStatus"
import { AUTOCOMPLETE_SYMBOLS_QUERY_KEY } from "src/core/offline/persistedQueries"
import { createSymbol } from "src/symbols/client"
import React from "react"
import { useQueryClient } from "@tanstack/react-query"
import sheepSymbol from "public/assets/sheep-symbols.png"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export const CreateInstantSymbolDialog = () => {
  const user = useCurrentUser()
  const online = useOnlineStatus()
  const { values, closeDialog, dialogOpen, setValues, state } = useInstantDreamDialog()
  const [cb] = state
  const [createSymbolMutation, { isLoading: isCreateSymbolLoading }] = useMutation(createSymbol)
  const queryClient = useQueryClient()

  // offline is read-only: the picker stops offering "create" then (SymbolsAutocomplete), but a
  // dialog opened online outlives the connection. It stays, so the typed name survives the drop,
  // with Add disabled; a submit (Enter) is refused rather than left to the mutation, which would
  // only pause and create the symbol on reconnect, behind the user's back
  const handleDialogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!online) return
    const symbol = await createSymbolMutation({
      ...values,
      icon: "lucidicon-tag",
    })
    await queryClient.refetchQueries([AUTOCOMPLETE_SYMBOLS_QUERY_KEY])
    cb?.(symbol)
    closeDialog()
  }

  return (
    <Dialog open={dialogOpen} onClose={closeDialog}>
      <form onSubmit={handleDialogSubmit}>
        <DialogTitle>Create a new symbol?</DialogTitle>
        <DialogContent>
          <Box className="text-center">
            <Image
              className="text-center"
              src={sheepSymbol}
              alt="symbols sheep"
              width={300}
              height={300}
            />
          </Box>
          <DialogContentText className="mb-4">
            You can add more details about this symbol later.
          </DialogContentText>
          {!online && (
            <DialogContentText className="mb-4">
              {"you're offline — reconnect to add it"}
            </DialogContentText>
          )}

          <Grid container>
            <Grid item xs={12}>
              <TextField
                autoFocus
                id="name"
                fullWidth
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
                label="Name"
                type="text"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className="mx-4 mb-4">
          <Button onClick={closeDialog} disabled={isCreateSymbolLoading}>
            Cancel
          </Button>
          {/* same as the deletion dialog: a portal never saw these max-w-* classes under v3 */}
          <Button
            type="submit"
            variant="contained"
            disabled={isCreateSymbolLoading || !online}
            // same as the deletion dialog: DialogActions' 8px gap wins, the sx never did
            className="w-auto"
            endIcon={isCreateSymbolLoading && <HourglassTopIcon className="opacity-50" />}
          >
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default CreateInstantSymbolDialog
