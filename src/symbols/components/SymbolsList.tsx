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
  // Fetch all symbols by setting a very large 'take' value // TODO: implement proper pagination on the server side
  const [{ symbols }, { refetch, isLoading }] = usePaginatedQuery(getSymbolsWithUsage, {
    take: 250,
  })

  function onPageChange(_, page: number) {
    router.push({ query: { page: page } })
  }

  useEffect(() => {
    const currentPage = Number(router.query.page) || undefined
    if (!!currentPage && !isLoading && symbols) {
      const latestPage = Math.ceil(symbols.length / ITEMS_PER_PAGE)
      if (currentPage > latestPage) {
        router.push({ query: { ...router.query, page: latestPage } })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, symbols, router])

  useEffect(() => {
    async function refetchSymbols() {
      if (router.query.refetch === "true") {
        await refetch?.()
        router.push({ query: { page: Math.ceil((symbols.length + 1) / ITEMS_PER_PAGE) } })
      }
    }

    refetchSymbols()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    const id = Number(router.query.id) || undefined
    if (!router.query.page && !isLoading && id) {
      const symbolPage =
        Math.floor(symbols.findIndex((symbol) => id === symbol.id) / ITEMS_PER_PAGE) + 1
      router.push({ query: { ...router.query, page: symbolPage } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, router])

  return (
    <>
      {isLoading && <LoadingSpiral />}

      {!isLoading && (
        <>
          {symbols.length === 0 ? (
            <Paper className="bg-mui-secondary-light">
              <Box sx={{ p: 2 }}>
                <Typography variant="body1" gutterBottom className="mb-0">
                  You haven&apos;t created any symbols yet.
                </Typography>
              </Box>
            </Paper>
          ) : (
            symbols
              .slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
              .map((symbol) => (
                <SymbolCard
                  key={symbol.id}
                  symbol={symbol}
                  onAfterUpdate={refetch}
                  edit={editSymbolId === symbol.id}
                  onChangeEdit={(symbolId) => setEditSymbolId(symbolId)}
                />
              ))
          )}

          {symbols.length > 0 && (
            <Paper sx={{ display: "inline-block" }}>
              <Pagination
                count={Math.ceil(symbols.length / ITEMS_PER_PAGE)}
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
