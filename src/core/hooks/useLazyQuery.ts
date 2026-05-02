import { useQuery } from "@blitzjs/rpc"
import { useState } from "react"

export const useLazyQuery = (key, fn, options) => {
  const [enabled, setEnabled] = useState(false)
  return [() => setEnabled(true), useQuery(key, fn, { ...options, enabled })]
}
