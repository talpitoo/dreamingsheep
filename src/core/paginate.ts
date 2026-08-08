// Exact reimplementation of blitz@2.0.0-beta.31's paginate (verified against the
// published tarball, dist/index-server.cjs). The subtle load-bearing detail:
// `take` defaults to **0**, and the resolver bodies spread it conditionally
// (`...(paginateArgs?.take ? { take } : {})`), so an omitted take means
// "no limit" — ExportDreams and the stats aggregation rely on fetching ALL rows.
// Do NOT "clean up" the zero default; it is the API contract.

interface PaginateArgs<T> {
  skip?: number
  take?: number
  maxTake?: number
  count: () => Promise<number>
  query: (args: { skip: number; take: number }) => Promise<T[]>
}

export async function paginate<T>({
  skip = 0,
  take = 0,
  maxTake = 250,
  count: countQuery,
  query,
}: PaginateArgs<T>) {
  if (!Number.isInteger(skip)) throw new Error("`skip` argument must be a integer")
  if (!Number.isInteger(take)) throw new Error("`take` argument must be a integer")
  if (!Number.isInteger(maxTake)) throw new Error("`maxTake` argument must be a integer")
  if (skip < 0) throw new Error("`skip` argument must be a positive number")
  if (take < 0) throw new Error("`take` argument must be a positive number")
  if (take > maxTake) {
    throw new Error("`take` argument must less than `maxTake` which is currently " + maxTake)
  }

  const [count, items] = await Promise.all([countQuery(), query({ skip, take })])
  const hasMore = skip + take < count
  const nextPage = hasMore ? { take, skip: skip + take } : null
  const pageCount = Math.floor((count + take - 1) / take)
  const from = skip + 1
  const to = skip + take

  return {
    items,
    nextPage,
    hasMore,
    count,
    pageCount,
    from,
    to,
  }
}
