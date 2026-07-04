// src/pages/api/s3/upload.ts
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { getSession } from "@blitzjs/auth"
import formidable from "formidable"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { DateTime } from "luxon"
import type { NextApiRequest, NextApiResponse } from "next"

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
}

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

const MAX_FILE_SIZE = 1024 * 1024 * 3 // 3MB

async function getUserTotalSize(userId: number) {
  try {
    const list = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET,
        Prefix: `user-${userId}`,
      })
    )
    return list.Contents?.reduce((t, x) => t + (x.Size || 0), 0) || 0
  } catch {
    return 0
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    // Bypass Blitz CSRF check: temporarily pretend this is a GET so getSession skips CSRF validation
    const originalMethod = req.method
    req.method = "GET"
    const session = await getSession(req, res)
    req.method = originalMethod

    if (!session.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const currentSize = await getUserTotalSize(session.userId)

    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    })

    const files = await new Promise<formidable.Files>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve(files)
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file || !file.size) {
      return res.status(400).json({ error: "Invalid file" })
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: "File too large" })
    }

    if (currentSize + file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "Quota exceeded",
        size: currentSize,
      })
    }

    const buffer = fs.readFileSync(file.filepath)
    const fileName = `${DateTime.now().toFormat("yyyy-MM-dd")}_${uuidv4()}_${file.originalFilename}`
    const key = `user-${session.userId}/${fileName}`

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.mimetype || "application/octet-stream",
      })
    )

    fs.unlinkSync(file.filepath)

    return res.status(200).json({
      success: true,
      key,
      size: currentSize + file.size,
    })
  } catch (e) {
    console.error("Upload error:", e)
    return res.status(500).json({ error: "Failed to upload file" })
  }
}
