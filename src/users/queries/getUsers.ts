import { resolver } from "src/core/resolver"
import { paginate } from "src/core/paginate"
import db, { Prisma } from "db"

interface GetUsersInput
  extends Pick<Prisma.UserFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

export default resolver.pipe(
  // listing users is an admin-only capability (rows include hashedPassword!)
  resolver.authorize("ADMIN"),
  async ({ where, orderBy, skip, take }: GetUsersInput) => {
    const {
      items: users,
      hasMore,
      nextPage,
      count,
    } = await paginate({
      skip,
      take,
      count: () => db.user.count({ where }),
      query: (paginateArgs) =>
        db.user.findMany({
          ...(paginateArgs?.skip ? { skip: paginateArgs.skip } : {}),
          ...(paginateArgs?.take ? { take: paginateArgs.take } : {}),
          where,
          orderBy,
        }),
    })

    return {
      users,
      nextPage,
      hasMore,
      count,
    }
  }
)
