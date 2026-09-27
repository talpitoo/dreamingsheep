import { Alert } from "@mui/material"
import { useOnlineStatus } from "src/core/offline/onlineStatus"
import { useSyncAuthRequired } from "src/core/offline/syncStatus"
import { usePendingDreams } from "src/dreams/offline/usePendingDreams"

// rendered by Layout right under the header, in the page flow: it pushes the content down and
// scrolls away with it, so it never covers the navigation (the corner ribbon stays put instead)
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const pending = usePendingDreams()
  const authRequired = useSyncAuthRequired()

  if (online && !(authRequired && pending.length > 0)) return null

  return (
    <Alert severity="info" className="w-full rounded-none justify-center">
      {!online
        ? pending.length > 0
          ? `you're offline — ${pending.length} dream${
              pending.length > 1 ? "s" : ""
            } tucked away, they'll sync when you're back`
          : "you're offline — dreams you add are saved on this device until you're back"
        : `please log in again to sync ${pending.length} pending dream${
            pending.length > 1 ? "s" : ""
          }`}
    </Alert>
  )
}
