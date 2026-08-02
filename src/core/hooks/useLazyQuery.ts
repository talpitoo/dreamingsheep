import { useQuery } from "src/core/rpc-client"
import { useState } from "react"

export const useLazyQuery = (key: any, fn: any, options?: any) => {
  const [enabled, setEnabled] = useState(false)
  return [() => setEnabled(true), (useQuery as any)(key, fn, { ...options, enabled })]
}
