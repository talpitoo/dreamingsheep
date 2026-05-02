import Image from "next/image"
import { Typography, IconButton, Backdrop } from "@mui/material"
import { Box } from "@mui/system"
import { useMemo } from "react"
import { useFileUpload } from "use-file-upload"
import { humanFileSize } from "../utils"
import { Config } from "src/config"
import { loader } from "src/utils/loader"
import { MAX_FILE_SIZE } from "src/core/constants/general"
import LoadingSpiral from "src/core/components/LoadingSpiral"

interface PreviewProps {
  uploading?: boolean
  file?: ReturnType<typeof useFileUpload>["0"]
  picture?: string | null
  size?: number
  onRemove?: () => void
}

export const Preview = (props: PreviewProps) => {
  const file = useMemo(() => (Array.isArray(props.file) ? props.file[0] : props.file), [props.file])
  const picture = useMemo(() => props.picture, [props.picture])
  const size = useMemo(() => props.size, [props.size])
  const uploading = useMemo(() => props.uploading, [props.uploading])

  if (!picture && !file) {
    return <></>
  }

  return (
    <Box>
      <Box className="relative">
        <Box pt={0.25} pb={1} className="image-upload-fullwidth">
          <Image
            unoptimized
            width={750}
            height={350}
            className="absolute w-full h-auto"
            // objectFit="contain"
            // objectPosition="left top"
            // @ts-expect-error prop mismatch: file.source is valid URL and not string
            src={file?.source || `${Config.S3Bucket}/${picture}`}
            loader={file?.source ? undefined : loader}
            alt="image of the symbol"
          />
        </Box>
        <Backdrop className="absolute" open={!!uploading}>
          <LoadingSpiral />
        </Backdrop>
      </Box>
      {!uploading && (
        <>
          <Typography variant="caption">
            {humanFileSize(size || 0, true)} of 3 MB quota used
          </Typography>

          <IconButton color="primary" sx={{ ml: 1 }} onClick={() => props.onRemove?.()}>
            <span className="lucidicon-trash"></span>
          </IconButton>
        </>
      )}

      {file && (
        <>
          {size === undefined && !uploading && (
            <Typography variant="caption" sx={{ color: "red", display: "block" }}>
              Failed get total size, please re-upload
            </Typography>
          )}
          {(size || 0) > MAX_FILE_SIZE && (
            <Typography variant="caption" sx={{ color: "red", display: "block" }}>
              Image size is too big, please try resizing and re-upload
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}
