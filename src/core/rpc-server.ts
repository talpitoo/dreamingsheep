import type { NextApiRequest, NextApiResponse } from "next"
import superjson from "superjson"
import { getSession } from "src/auth/session"
import { serializeError } from "./errors"
import { rpcRegistry } from "./rpc-registry"

export async function handleRpc(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).end()
    return
  }
  const endpoint = String(req.query.endpoint ?? "")
  const resolverFn = rpcRegistry[endpoint]
  if (!resolverFn) {
    res.status(404).send(
      superjson.stringify({
        error: { name: "NotFoundError", message: `Unknown endpoint: ${endpoint}`, statusCode: 404 },
      })
    )
    return
  }
  try {
    const session = await getSession(req, res)
    const params = req.body == null ? null : superjson.deserialize(req.body)
    const result = await resolverFn(params, { session })
    res.status(200).send(superjson.stringify({ result: result ?? null }))
  } catch (error) {
    console.log(error) // parity with the old rpcHandler({ onError: console.log })
    const payload = serializeError(error)
    res.status(payload.statusCode).send(superjson.stringify({ error: payload }))
  }
}
