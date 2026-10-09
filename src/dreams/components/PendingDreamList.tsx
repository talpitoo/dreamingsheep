import { Box, Button, Card, CardActions, CardContent, Typography } from "@mui/material"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"
import { DateTime } from "luxon"
import { useSession } from "src/auth/client"
import { DreamItemFooter, DreamItemFooterProps } from "src/dreams/components/DreamList"
import { removeFromOutbox, retryOutboxEntry } from "src/dreams/offline/outbox"
import { usePendingDreams } from "src/dreams/offline/usePendingDreams"

const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// the dream form's values, queued as submitted
type QueuedDream = DreamItemFooterProps & { title?: string; description?: string }

interface PendingDreamListProps {
  dateIso: string
}

// dreams written offline for one local day, shown until they sync
export const PendingDreamList = ({ dateIso }: PendingDreamListProps) => {
  const { userId } = useSession()
  const pending = usePendingDreams()
  if (!userId) return null

  const entries = pending.filter(
    (entry) =>
      DateTime.fromISO(entry.values.dreamAt as string)
        .setZone(userTimezone)
        .toISODate() === dateIso
  )

  return (
    <>
      {entries.map(({ clientId, values, lastError }) => {
        const dream = values as QueuedDream
        return (
          <Card key={clientId} className="mb-4">
            <CardContent>
              <Typography variant="h5" component="h2">
                {dream.title}
              </Typography>
              {dream.description && (
                <Typography variant="body1" className="pre-wrap mt-2">
                  {dream.description}
                </Typography>
              )}
              {lastError ? (
                <Typography
                  variant="caption"
                  component="p"
                  color="error"
                  className="mt-2 wrap-break-word"
                >
                  {lastError}
                </Typography>
              ) : (
                <Typography
                  variant="caption"
                  component="p"
                  className="mt-2 flex items-center gap-1 text-gray-400"
                >
                  waiting to sync <HourglassTopIcon className="opacity-50" fontSize="small" />
                </Typography>
              )}
            </CardContent>
            <CardActions className="p-4 block sm:flex">
              <Box className="grow mb-4 sm:mb-0">
                <DreamItemFooter
                  time={dream.time}
                  mood={dream.mood}
                  recall={dream.recall}
                  type={dream.type}
                  symbols={dream.symbols}
                />
              </Box>
              <Box className="flex justify-end">
                {lastError && (
                  <Button
                    size="small"
                    onClick={() => retryOutboxEntry(window.localStorage, userId, clientId)}
                  >
                    retry
                  </Button>
                )}
                <Button
                  size="small"
                  onClick={() => removeFromOutbox(window.localStorage, userId, clientId)}
                >
                  discard
                </Button>
              </Box>
            </CardActions>
          </Card>
        )
      })}
    </>
  )
}
