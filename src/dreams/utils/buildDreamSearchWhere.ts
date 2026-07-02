import { DreamTime, DreamType, Prisma, RecallTime } from "db"
import { ParsedUrlQuery } from "querystring"

export interface DreamSearchValues {
  q?: string
  favorite?: string
  time?: DreamTime[]
  mood?: number[]
  recall?: RecallTime[]
  type?: DreamType[]
  symbolIds?: number[]
}

// Single source of truth for the advanced search semantics, shared by the
// Search page (values from URL params) and the advanced Stats chart (live form values).
export function buildDreamSearchWhere(values: DreamSearchValues): Prisma.DreamWhereInput {
  return {
    AND: [
      {
        OR: [
          {
            title: {
              contains: values.q ? values.q : undefined,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: values.q ? values.q : undefined,
              mode: "insensitive",
            },
          },
        ],
      },
      ...(values.favorite ? [{ favorite: values.favorite === "TRUE" }] : []),
      ...(values.time && values.time.length > 0 ? [{ time: { in: values.time } }] : []),
      ...(values.mood && values.mood.length > 0 ? [{ mood: { in: values.mood } }] : []),
      ...(values.recall && values.recall.length > 0 ? [{ recall: { in: values.recall } }] : []),
      ...(values.type && values.type.length > 0 ? [{ type: { in: values.type } }] : []),
      ...(values.symbolIds && values.symbolIds.length > 0
        ? [{ symbols: { some: { id: { in: values.symbolIds } } } }]
        : []),
    ],
  }
}

export function parseDreamSearchQuery(query: ParsedUrlQuery): DreamSearchValues {
  return {
    q: query.q ? decodeURI(query.q as string) : undefined,
    favorite: query.favorite ? decodeURI(query.favorite as string) : undefined,
    time: query.time ? (decodeURI(query.time as string).split(",") as DreamTime[]) : [],
    mood: query.mood
      ? (decodeURI(query.mood as string)
          .split(",")
          .map((val) => +val) as number[])
      : [],
    recall: query.recall ? (decodeURI(query.recall as string).split(",") as RecallTime[]) : [],
    type: query.type ? (decodeURI(query.type as string).split(",") as DreamType[]) : [],
    symbolIds: query.symbols
      ? (decodeURI(query.symbols as string)
          .split(",")
          .map((val) => +val) as number[])
      : [],
  }
}
