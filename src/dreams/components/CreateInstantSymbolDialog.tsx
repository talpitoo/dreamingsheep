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
import { createSymbol } from "src/symbols/client"
import React from "react"
import { useQueryClient } from "@tanstack/react-query"
import sheepSymbol from "public/assets/sheep-symbols.png"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export const CreateInstantSymbolDialog = () => {
  const user = useCurrentUser()
  const { values, closeDialog, dialogOpen, setValues, state } = useInstantDreamDialog()
  const [cb] = state
  const [createSymbolMutation, { isLoading: isCreateSymbolLoading }] = useMutation(createSymbol)
  const queryClient = useQueryClient()

  const handleDialogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const symbol = await createSymbolMutation({
      ...values,
      icon: "lucidicon-tag",
    })
    await queryClient.refetchQueries(["get-symbols-autocomplete"])
    cb?.(symbol)
    closeDialog()
  }

  return (
    <Dialog open={dialogOpen} onClose={closeDialog}>
      <form onSubmit={handleDialogSubmit}>
        <DialogTitle>Create a new symbol?</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center" }}>
            <Image
              className="text-center"
              src={sheepSymbol}
              alt="symbols sheep"
              width={300}
              height={300}
            />
          </Box>
          <DialogContentText sx={{ mb: 2 }}>
            You can add more details about this symbol later.
          </DialogContentText>

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
        <DialogActions sx={{ mx: 2, mb: 2 }}>
          <Button onClick={closeDialog} disabled={isCreateSymbolLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{ ml: 2 }}
            disabled={isCreateSymbolLoading}
            className={`w-auto transition-all ease-in-out duration-300 ${
              isCreateSymbolLoading ? "max-w-[87px]" : "max-w-[64px]"
            }`}
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
