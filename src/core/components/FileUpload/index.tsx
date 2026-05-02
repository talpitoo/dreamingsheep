import { useMutation } from "@blitzjs/rpc"
import { Box, Button, Grid, Typography } from "@mui/material"
import { forwardRef, useEffect, useMemo, useState } from "react"
import { useUpload } from "./hooks"
import { Preview } from "./components"
import { useFileUpload } from "use-file-upload"
import { useFormContext } from "react-hook-form"
import { SymbolWithUsage } from "src/symbols/queries/getSymbolsWithUsage"
import updateSymbol from "src/symbols/mutations/updateSymbol"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

const FileUpload = forwardRef<
  HTMLButtonElement,
  {
    name: string
    initialValues?: SymbolWithUsage
    onAfterUpdate?: () => void
  }
>(({ name, initialValues, onAfterUpdate }, ref) => {
  const { setValue } = useFormContext()
  const [updateSymbolMutation, { isLoading: isUpdateSymbolLoading }] = useMutation(updateSymbol)

  const [currentFile, setCurrentFile] = useState<ReturnType<typeof useFileUpload>["0"] | undefined>(
    undefined
  )
  const [currentKey, setCurrentKey] = useState<string | undefined | null>(initialValues?.picture)

  const { upload, remove, init, file, size, loading } = useUpload({
    onSuccess: async (key) => {
      setValue(name, key || null)
      setCurrentKey(key || null)
      if (initialValues?.id) {
        await updateSymbolMutation({ ...initialValues, picture: key || null })
        onAfterUpdate?.()
      }
    },
  })

  const handleRemoveFile = async () => {
    setCurrentFile(undefined)
    setCurrentKey(undefined)
    if (currentKey) {
      remove(currentKey)
      setCurrentKey(undefined)
    }
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCurrentFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Box sx={{ border: 1, borderRadius: 1, borderColor: "#c4c4c4" }} p={1}>
          <Typography variant="caption" className="image-upload-label">
            image
          </Typography>
          <Preview
            file={currentFile}
            picture={currentKey}
            size={size}
            uploading={loading || isUpdateSymbolLoading}
            onRemove={handleRemoveFile}
          />
          {!loading &&
            !isUpdateSymbolLoading &&
            (!currentKey || (currentKey && size === undefined)) && (
              <Button
                ref={ref}
                disabled={loading || isUpdateSymbolLoading}
                onClick={upload}
                className={`w-auto transition-all ease-in-out duration-300 ${
                  loading || isUpdateSymbolLoading ? "max-w-[99px]" : "max-w-[75px]"
                }`}
                endIcon={
                  (loading || isUpdateSymbolLoading) && <HourglassTopIcon className="opacity-50" />
                }
              >
                Upload
              </Button>
            )}
        </Box>
      </Grid>
    </Grid>
  )
})
FileUpload.displayName = "FileUpload"

export default FileUpload
