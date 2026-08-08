import { getSession } from "src/auth/session"
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3"
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

async function recursiveDelete(prefix: string, count = 0, token?: string): Promise<number> {
  const list = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: token,
    })
  )

  if (list.KeyCount && list.Contents) {
    const deleted = await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET,
        Delete: {
          Objects: list.Contents.map((item) => ({ Key: item.Key })),
          Quiet: false,
        },
      })
    )
    count += deleted.Deleted?.length || 0

    if (deleted.Errors) {
      deleted.Errors.forEach((error) =>
        console.error(`${error.Key} could not be deleted - ${error.Code}`)
      )
    }
  }

  if (list.NextContinuationToken) {
    return recursiveDelete(prefix, count, list.NextContinuationToken)
  }

  return count
}

export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // CSRF deliberately skipped (same effective behavior as the old GET-spoof hack);
  // session auth still required
  const session = await getSession(req, res, { skipCsrf: true })

  if (!session.userId) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const prefix = `user-${session.userId}`
    const deletedCount = await recursiveDelete(prefix)

    console.log(
      `[DeleteFolderSucceed] User: ${session.userId}, Folder: ${prefix}, Count: ${deletedCount}`
    )

    return res.status(200).json({ success: true, deletedCount })
  } catch (error) {
    console.error("S3 delete folder error:", error)
    return res.status(500).json({ error: "Failed to delete folder" })
  }
}
