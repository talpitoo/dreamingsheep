import { ImageLoader } from "next/image"
import { Config } from "src/config"

export const loader: ImageLoader = ({ src }) => {
  if (!src.startsWith("/")) {
    src = "/" + src
  }

  return Config.S3Bucket + src
}
