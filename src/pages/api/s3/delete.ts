import { getSession } from "@blitzjs/auth"
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import type { NextApiRequest, NextApiResponse } from "next"

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // local S3 mock for development (LocalStack, see issue #13): set e.g.
  // S3_ENDPOINT=http://localhost:4566 — unset in production, where the real AWS endpoint is used
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
})

async function getUserTotalSize(userId: number): Promise<number> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      Prefix: `user-${userId}`,
    })
    const list = await s3Client.send(command)
    const size = list.Contents?.reduce((total, { Size }) => total + (Size || 0), 0) || 0
    return size
  } catch (error) {
    console.error("Get total size error:", error)
    return 0
  }
}

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("=== DELETE HANDLER START ===", req.method)

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const originalMethod = req.method
  req.method = "GET"
  const session = await getSession(req, res)
  req.method = originalMethod

  if (!session.userId) {
    console.log("No session")
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const key = Array.isArray(req.query.key) ? req.query.key[0] : req.query.key
    console.log("Delete key:", key, "userId:", session.userId)

    if (!key) {
      return res.status(400).json({ error: "No key provided" })
    }

    if (!key.startsWith(`user-${session.userId}/`)) {
      return res.status(403).json({ error: "Forbidden" })
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      })
    )

    const size = await getUserTotalSize(session.userId)
    console.log("Delete success:", key)

    return res.status(200).json({ success: true, size })
  } catch (error) {
    console.error("Delete error:", error)
    return res.status(500).json({ error: "Failed to delete file" })
  }
}
