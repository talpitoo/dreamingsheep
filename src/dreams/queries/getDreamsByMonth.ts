import { resolver } from "src/core/resolver"
import { Ctx } from "src/core/types"
import db, { Prisma } from "db"
import { DateTime } from "luxon"

interface GetDreamsInput
  extends Pick<Prisma.DreamFindManyArgs, "where" | "orderBy" | "skip" | "take"> {
  userTimezone: string
}

type GroupedDreams = { [date: string]: number }

export default resolver.pipe(
  resolver.authorize<GetDreamsInput>(),
  async ({ where = {}, userTimezone }: GetDreamsInput, ctx: Ctx) => {
    where["userId"] = ctx.session.userId

    // 1. first get the dreams from the DB 'as is' (which is in UTC)
    const dreams = await db.dream.findMany({
      where,
    })

    // 2. then convert the dream dates to local timezone
    const dreamsInLocalTime = dreams.map((dream) => ({
      ...dream,
      title: dream.title,
      dreamAtUtc: dream.dreamAt,
      createdAt: dream.createdAt,
      dreamAt: DateTime.fromJSDate(dream.dreamAt).setZone(userTimezone).toISODate(), // NOTE: possible UTC/local timezone conflict, double-check
    }))

    // 3. and finally group the dreams by their local timezone (userTimezone)
    const groupedDreams = dreamsInLocalTime.reduce((result, dream) => {
      const isoDate = dream.dreamAt // You can use the dreamAt value as the key

      if (!result[isoDate]) {
        result[isoDate] = { count: 0, dreams: [] }
      }

      const entry = `${dream.dreamAtUtc} ${dream.title}` // NOTE: this is almost just for debug info ?debug=true
      result[isoDate].count += 1
      result[isoDate].dreams.push(entry)

      return result
    }, {})

    return groupedDreams
  }
)
