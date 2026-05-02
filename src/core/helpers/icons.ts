import { DreamTime, DreamType, RecallTime } from "db"

export const TIME_ICONS = [
  { value: DreamTime.MORNING, label: "morning", icon: "lucidicon-sun" },
  { value: DreamTime.AFTERNOON, label: "afternoon", icon: "lucidicon-coffee" },
  { value: DreamTime.EVENING, label: "evening", icon: "lucidicon-sunset" },
  { value: DreamTime.NIGHT, label: "night", icon: "lucidicon-starry-night" },
]

export const MOOD_ICONS = [
  { value: 1, icon: "lucidicon-smiley-scarry" },
  { value: 2, icon: "lucidicon-smiley-sad" },
  { value: 3, icon: "lucidicon-smiley-neutral" },
  { value: 4, icon: "lucidicon-smiley-smiley" },
  { value: 5, icon: "lucidicon-smiley-laugh" },
]

export const RECALL_ICONS = [
  {
    value: RecallTime.BLURRY,
    label: "blurry",
    icon: "lucidicon-batteryempty",
  },
  { value: RecallTime.N_A, label: "N/A", icon: "lucidicon-batteryhalf" },
  { value: RecallTime.CLEAR, label: "clear", icon: "lucidicon-batteryfull" },
]

export const TYPE_ICONS = [
  {
    value: DreamType.REGULAR,
    label: "regular",
    icon: "lucidicon-zzz",
  },
  {
    value: DreamType.LUCID,
    label: "lucid",
    icon: "lucidicon-eye",
  },
  {
    value: DreamType.SLEEP_PARALYSIS,
    label: "sleep paralysis",
    icon: "lucidicon-eyes",
  },
  {
    value: DreamType.HYPNOSIS,
    label: "hypnosis",
    icon: "lucidicon-spiral-simmetrical",
  },
  {
    value: DreamType.DAYDREAM,
    label: "daydream",
    icon: "lucidicon-think-bubble",
  },
  {
    value: DreamType.PSYCHEDELIC,
    label: "psychedelic",
    icon: "lucidicon-mushroom",
  },
  {
    value: DreamType.MEDITATION,
    label: "mediation",
    icon: "lucidicon-meditation",
  },
]

export const FAVORITE_ICONS = [
  { value: "TRUE", label: "true", icon: "lucidicon-star-full" },
  { value: "FALSE", label: "false", icon: "lucidicon-star" },
]

export function getClassnameByTime(time: DreamTime) {
  switch (time) {
    case DreamTime.MORNING:
      return "lucidicon-sun"
    case DreamTime.AFTERNOON:
      return "lucidicon-coffee"
    case DreamTime.EVENING:
      return "lucidicon-sunset"
    case DreamTime.NIGHT:
      return "lucidicon-starry-night"
  }
}

export function getClassnameByMood(mood?: number) {
  switch (mood) {
    case 1:
      return "lucidicon-smiley-scarry"
    case 2:
      return "lucidicon-smiley-sad"
    case 3:
      return "lucidicon-smiley-neutral"
    case 4:
      return "lucidicon-smiley-smiley"
    case 5:
      return "lucidicon-smiley-laugh"
  }
}

export function getClassnameByRecall(recall: RecallTime) {
  switch (recall) {
    case RecallTime.BLURRY:
      return "lucidicon-batteryempty"
    case RecallTime.N_A:
      return "lucidicon-batteryhalf"
    case RecallTime.CLEAR:
      return "lucidicon-batteryfull"
  }
}

export function getClassnameByType(type: DreamType) {
  switch (type) {
    case DreamType.REGULAR:
      return "lucidicon-zzz"
    case DreamType.LUCID:
      return "lucidicon-eye"
    case DreamType.SLEEP_PARALYSIS:
      return "lucidicon-eyes"
    case DreamType.HYPNOSIS:
      return "lucidicon-spiral-simmetrical"
    case DreamType.DAYDREAM:
      return "lucidicon-think-bubble"
    case DreamType.PSYCHEDELIC:
      return "lucidicon-mushroom"
    case DreamType.MEDITATION:
      return "lucidicon-meditation"
  }
}
