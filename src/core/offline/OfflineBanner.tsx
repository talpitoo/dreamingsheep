import { Alert } from "@mui/material"
import WifiOffIcon from "@mui/icons-material/WifiOff"
import { useSession } from "src/auth/client"
import { useOnlineStatus } from "src/core/offline/onlineStatus"
import { useSyncAuthRequired } from "src/core/offline/syncStatus"
import { usePendingDreams } from "src/dreams/offline/usePendingDreams"

// rendered by Layout right under the header, in the page flow: it pushes the content down and
// scrolls away with it, so it never covers the navigation (the corner ribbon stays put instead)
export default function OfflineBanner() {
  const online = useOnlineStatus()
  const { userId } = useSession()
  const pending = usePendingDreams()
  const authRequired = useSyncAuthRequired()
  const authPrompt = authRequired && pending.length > 0
  // parked dreams (rejected for good, or out of attempts) never move by themselves: online too,
  // only a retry or a discard on their day does
  const parked = pending.filter((entry) => entry.lastError).length

  if (online && !authPrompt && parked === 0) return null

  // one banner, most pressing message first: offline, then the session, then parked dreams.
  // The header's logo sheep (absolute, 150px) hangs ~70px below the bar and stays on top: the
  // content starts to its right (and keeps centered on md+ with the same padding on both sides)
  return (
    <Alert
      severity="info"
      icon={!online ? <WifiOffIcon fontSize="inherit" /> : undefined}
      className="w-full rounded-none justify-center pl-[150px] md:px-[150px]"
    >
      {!online
        ? pending.length > 0
          ? `you're offline — ${pending.length} dream${
              pending.length > 1 ? "s" : ""
            } tucked away, they'll sync when you're back`
          : userId
          ? "you're offline — dreams you add are saved on this device until you're back"
          : "you're offline"
        : authPrompt
        ? `please log in again to sync ${pending.length} pending dream${
            pending.length > 1 ? "s" : ""
          }`
        : parked > 1
        ? `${parked} dreams need a look — open their day to retry or discard`
        : "1 dream needs a look — open its day to retry or discard"}
    </Alert>
  )
}
