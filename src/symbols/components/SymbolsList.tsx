import { useRouter } from "next/router"
import { usePaginatedQuery } from "@blitzjs/rpc"
import { useEffect, useState } from "react"
import getSymbolsWithUsage from "src/symbols/queries/getSymbolsWithUsage"
import SymbolCard from "src/symbols/components/SymbolCard"
import { Pagination, Paper, Box, Typography } from "@mui/material"
import { ITEMS_PER_PAGE } from "src/core/constants/general"
import LoadingSpiral from "src/core/components/LoadingSpiral"

export const SymbolsList = () => {
  const router = useRouter()
  const [editSymbolId, setEditSymbolId] = useState<number | null>(null)
  const page = Number(router.query.page) || 1
  const deepLinkedSymbolId = Number(router.query.id) || undefined
  const [{ symbols, count, symbolPosition }, { refetch, isLoading }] = usePaginatedQuery(
    getSymbolsWithUsage,
    {
      skip: ITEMS_PER_PAGE * (page - 1),
      take: ITEMS_PER_PAGE,
      // deep link from a dream carries only the symbol id — ask the server which page it lives on
      positionOfId: !router.query.page && deepLinkedSymbolId ? deepLinkedSymbolId : undefined,
    }
  )

  function onPageChange(_, page: number) {
    router.push({ query: { page: page } })
  }

  useEffect(() => {
    const currentPage = Number(router.query.page) || undefined
    if (!!currentPage && !isLoading) {
      const latestPage = Math.max(1, Math.ceil(count / ITEMS_PER_PAGE))
      if (currentPage > latestPage) {
        router.push({ query: { ...router.query, page: latestPage } })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, count, router])

  useEffect(() => {
    async function refetchSymbols() {
      if (router.query.refetch === "true") {
        await refetch?.()
        router.push({ query: { page: Math.ceil((count + 1) / ITEMS_PER_PAGE) } })
      }
    }

    refetchSymbols()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    if (!router.query.page && !isLoading && symbolPosition) {
      // scroll: false — the deep-linked SymbolCard smooth-scrolls itself into view;
      // the default scroll-to-top would cancel it when the card is already rendered
      router.push(
        {
          query: { ...router.query, page: Math.ceil(symbolPosition / ITEMS_PER_PAGE) },
        },
        undefined,
        { scroll: false }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, symbolPosition, router])

  return (
    <>
      {isLoading && <LoadingSpiral />}

      {!isLoading && (
        <>
          {count === 0 ? (
            <Paper className="bg-mui-secondary-light">
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" gutterBottom className="mb-0">
                  You haven&apos;t created any symbols yet.
                </Typography>
              </Box>
            </Paper>
          ) : (
            symbols.map((symbol) => (
              <SymbolCard
                key={symbol.id}
                symbol={symbol}
                onAfterUpdate={refetch}
                edit={editSymbolId === symbol.id}
                onChangeEdit={(symbolId) => setEditSymbolId(symbolId)}
              />
            ))
          )}

          {count > 0 && (
            <Paper sx={{ display: "inline-block" }}>
              <Pagination
                count={Math.ceil(count / ITEMS_PER_PAGE)}
                page={page}
                color="primary"
                onChange={onPageChange}
                shape="rounded"
              />
            </Paper>
          )}
        </>
      )}
    </>
  )
}
