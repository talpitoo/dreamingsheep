import { api } from "src/blitz-server"
import { S3Client, ListObjectsCommand } from "@aws-sdk/client-s3"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export default api(async (req, res, ctx) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  if (!ctx.session.userId) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const command = new ListObjectsCommand({
      Bucket: process.env.S3_BUCKET,
      Prefix: `user-${ctx.session.userId}`,
    })

    const list = await s3Client.send(command)
    const size = list.Contents?.reduce((total, { Size }) => total + (Size || 0), 0) || 0

    console.log(`[GetTotalSizeSucceed] User ID: ${ctx.session.userId}, Size: ${size}`)

    return res.status(200).json({ size })
  } catch (error) {
    console.error("[GetTotalSizeFailed] Error:", error)
    return res.status(500).json({ error: "Failed to get size" })
  }
})
