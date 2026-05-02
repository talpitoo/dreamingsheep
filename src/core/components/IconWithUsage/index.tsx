// NOTE: not used after the DB schema update https://gitlab.com/talpitoo/dreamingsheep/-/issues/110
import { Tooltip } from "@mui/material"
import classnames from "src/utils/classnames"
import { useMemo } from "react"
import {
  CountInfo,
  DEFAULT_MOOD_ICON,
  DEFAULT_RECALL_ICON,
  DEFAULT_TIME_ICON,
  DEFAULT_TYPE_ICON,
  getHighestCount,
  getMoodIconByValue,
  getRecallIconByValue,
  getTimeIconByValue,
  getTypeIconByValue,
} from "./helpers"

interface IconWithUsageProps {
  type: "mood" | "recall" | "time" | "type"
  countInfo: CountInfo[]
}

const IconWithUsage = (props: IconWithUsageProps) => {
  const { type, countInfo } = props
  const highest = useMemo(() => {
    return getHighestCount(countInfo)
  }, [countInfo])
  const icon = useMemo(() => {
    switch (type) {
      case "mood":
        return getMoodIconByValue(highest?.value) ?? DEFAULT_MOOD_ICON
      case "recall":
        return getRecallIconByValue(highest?.value) ?? DEFAULT_RECALL_ICON
      case "time":
        return getTimeIconByValue(highest?.value) ?? DEFAULT_TIME_ICON
      case "type":
        return getTypeIconByValue(highest?.value) ?? DEFAULT_TYPE_ICON
      default:
        return null
    }
  }, [highest, type])

  return (
    <Tooltip title="The most frequent properties for this symbol">
      <span className={classnames(icon?.icon, "text-gray-400 text-xl ml-2 mr-3")} />
    </Tooltip>
  )
}

export default IconWithUsage
