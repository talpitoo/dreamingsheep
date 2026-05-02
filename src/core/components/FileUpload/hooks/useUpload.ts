import { getAntiCSRFToken } from "@blitzjs/auth"
import { useCallback, useState } from "react"
import { useFileUpload, FileUpload as FileUploadType } from "use-file-upload"
import { MAX_FILE_SIZE } from "src/core/constants/general"

type UseUploadOptions = { onSuccess: (key?: string) => void }
type UseUploadReturns = {
  loading: boolean
  upload: VoidFunction
  remove: (key: string) => void
  init: VoidFunction
  file: ReturnType<typeof useFileUpload>["0"]
  size?: number
}

type UseUpload = (options: UseUploadOptions) => UseUploadReturns

export const useUpload: UseUpload = ({ onSuccess }) => {
  const [file, selectFile] = useFileUpload()
  const [size, setSize] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)

  const onUpload = useCallback(
    async (file: FileUploadType) => {
      if (file.size <= MAX_FILE_SIZE) {
        setSize(undefined)
        setLoading(true)
        const response = await uploadFile(file?.file)
        setSize(
          typeof response?.size === "number" ? response.size + (file?.size || 0) : response?.size
        )
        onSuccess(response?.key)
        setLoading(false)
      } else {
        setSize(file.size)
      }
    },
    [onSuccess]
  )

  const onRemove = useCallback(
    async (key: string) => {
      setSize(undefined)
      setLoading(true)
      const response = await deleteFile(key)
      if (response && !response.error) {
        setSize(response.size)
        onSuccess("")
      } else {
        console.error("Delete failed:", response)
      }
      setLoading(false)
    },
    [onSuccess]
  )

  const upload = useCallback(() => {
    selectFile({ multiple: false, accept: "image/*" }, onUpload)
  }, [selectFile, onUpload])

  const remove = useCallback(
    (key: string) => {
      onRemove(key)
    },
    [onRemove]
  )

  const init = async () => {
    setSize(undefined)
    setLoading(true)
    const response = await getTotalSize()
    setSize(response.size)
    setLoading(false)
  }

  return { upload, remove, init, file, size, loading }
}

export const uploadFile = async (file: File) => {
  const csrf = getAntiCSRFToken()

  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/s3/upload", {
    method: "POST",
    credentials: "include",
    headers: csrf ? { "anti-csrf-token": csrf } : undefined,
    body: formData,
  })

  const body = await response.text()

  try {
    return JSON.parse(body)
  } catch {
    return { error: body || "Failed to upload file" }
  }
}

export const deleteFile = async (key: string) => {
  const csrf = getAntiCSRFToken()

  try {
    const url = `/api/s3/delete?key=${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "anti-csrf-token": csrf,
      },
    })

    const body = await response.text()
    try {
      return JSON.parse(body)
    } catch {
      return { error: body || "Failed to delete file" }
    }
  } catch (error) {
    console.error(error)
    console.log("Failed to delete file.")
    return null
  }
}

export const deleteFolder = async () => {
  const csrf = getAntiCSRFToken()

  try {
    await fetch("/api/s3/delete-folder", {
      method: "DELETE",
      credentials: "include",
      headers: {
        "anti-csrf-token": csrf,
      },
    })
  } catch (error) {
    console.error(error)
    console.log("Failed to delete folder.")
  }
}

export const getTotalSize = async () => {
  const csrf = getAntiCSRFToken()

  try {
    const response = await fetch("/api/s3/size", {
      credentials: "include",
      headers: {
        "anti-csrf-token": csrf,
      },
    })
    return response.json()
  } catch (error) {
    console.error(error)
    console.log("Failed to get size.")
    return null
  }
}
