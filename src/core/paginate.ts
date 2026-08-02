// Reimplementation of blitz's paginate helper — same contract as observed in
// getDreams/getSymbols: { items, nextPage, hasMore, count }.

interface PaginateArgs<T> {
  skip?: number
  take?: number
  count: () => Promise<number>
  query: (args: { skip: number; take: number }) => Promise<T[]>
}

export async function paginate<T>({ skip = 0, take = 250, count, query }: PaginateArgs<T>) {
  if (!Number.isInteger(skip) || skip < 0) throw new Error("paginate: skip must be >= 0")
  if (!Number.isInteger(take) || take < 1) throw new Error("paginate: take must be >= 1")

  const [total, items] = await Promise.all([count(), query({ skip, take })])
  const hasMore = skip + take < total

  return {
    items,
    nextPage: hasMore ? { skip: skip + take, take } : null,
    hasMore,
    count: total,
  }
}
