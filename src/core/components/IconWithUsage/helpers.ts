import { MOOD_ICONS, RECALL_ICONS, TIME_ICONS, TYPE_ICONS } from "src/core/helpers/icons"
import { filter, head, pipe, propEq, reverse, sortBy } from "lodash/fp"

export const DEFAULT_MOOD_ICON = MOOD_ICONS[2] as typeof MOOD_ICONS[number]
export const getMoodIconByValue = (val?: string) => MOOD_ICONS.find(propEq("value", val))

export const DEFAULT_TIME_ICON = TIME_ICONS[3] as typeof TIME_ICONS[number]
export const getTimeIconByValue = (val?: string) => TIME_ICONS.find(propEq("value", val))

export const DEFAULT_RECALL_ICON = RECALL_ICONS[1] as typeof RECALL_ICONS[number]
export const getRecallIconByValue = (val?: string) => RECALL_ICONS.find(propEq("value", val))

export const DEFAULT_TYPE_ICON = TYPE_ICONS[0] as typeof TYPE_ICONS[number]
export const getTypeIconByValue = (val?: string) => TYPE_ICONS.find(propEq("value", val))

export type CountInfo = { value: string; count: number }

// @ts-expect-error type mismatch
export const getHighestCount: (x: CountInfo[]) => CountInfo | undefined = pipe(
  filter((item) => item.count > 0),
  sortBy(["count"]),
  reverse,
  head
)
