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
        {/* No width animation in a dialog: MUI portals it out of #__next, so under Tailwind v3
            these max-w-* classes never applied at all. Cascade layers made them live, and the first
            thing they did was squeeze "Yes, Delete Account" onto three lines. The animation was
            never seen here — drop it rather than invent a new look (issue #1). */}
        <Button
          variant="contained"
          onClick={handleDelete}
          disabled={isBusy}
          className="w-auto"
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
