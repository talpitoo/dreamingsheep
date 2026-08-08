import { useQuery } from "src/core/rpc-client"
import { getCurrentUser } from "src/users/client"

export const useCurrentUser = () => {
  const [user] = useQuery(getCurrentUser, null, { notifyOnChangeProps: ["data"] })
  return user
}
