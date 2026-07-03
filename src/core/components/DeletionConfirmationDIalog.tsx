import Image from "next/image"
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material"
import sheepDelete from "public/assets/sheep-delete.png"
import { Fragment, ReactNode, useRef, useState } from "react"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export interface DeletionConfirmationDialogProps {
  open: boolean
  title: string
  message: string | ReactNode
  onCancel: () => void
  onDelete: () => void | Promise<void>
  deleteButton?: string
}

export function DeletionConfirmationDialog({
  open,
  title,
  message,
  onCancel,
  onDelete,
  deleteButton = "Delete",
}: DeletionConfirmationDialogProps) {
  // guards the WHOLE onDelete flow (some callers do more than the delete mutation,
  // e.g. S3 cleanup), so double-clicks can't fire a second request; the ref catches
  // clicks that land before React re-renders the disabled state
  const [isBusy, setIsBusy] = useState(false)
  const isDeletingRef = useRef(false)

  async function handleDelete() {
    if (isDeletingRef.current) return
    isDeletingRef.current = true
    setIsBusy(true)
    try {
      await onDelete()
    } finally {
      isDeletingRef.current = false
      setIsBusy(false)
    }
  }

  return (
    <Dialog
      maxWidth="sm"
      fullWidth
      open={open}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{message}</DialogContentText>
        <Box sx={{ textAlign: "center" }}>
          <Image
            src={sheepDelete}
            alt="symbols sheep"
            width={300}
            height={300}
            className="temporary-img-fix w-full h-auto max-w-[300px]"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ mx: 2, mb: 2 }}>
        <Button onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={isBusy}
          className={`w-auto transition-all ease-in-out duration-300 ${
            isBusy ? "max-w-[113px]" : "max-w-[89px]"
          }`}
          endIcon={isBusy && <HourglassTopIcon className="opacity-50" />}
          sx={{ ml: 2 }}
        >
          {deleteButton}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeletionConfirmationDialog
