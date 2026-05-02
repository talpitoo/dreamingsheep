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
import { Fragment, ReactNode } from "react"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export interface DeletionConfirmationDialogProps {
  open: boolean
  title: string
  message: string | ReactNode
  onCancel: () => void
  onDelete: () => void
  isDeleteLoading?: boolean
  deleteButton?: string
}

export function DeletionConfirmationDialog({
  open,
  title,
  message,
  onCancel,
  onDelete,
  isDeleteLoading = false,
  deleteButton = "Delete",
}: DeletionConfirmationDialogProps) {
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
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onDelete}
          disabled={isDeleteLoading}
          className={`w-auto transition-all ease-in-out duration-300 ${
            isDeleteLoading ? "max-w-[113px]" : "max-w-[89px]"
          }`}
          endIcon={isDeleteLoading && <HourglassTopIcon className="opacity-50" />}
          sx={{ ml: 2 }}
        >
          {deleteButton}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeletionConfirmationDialog
