import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/router"
import { usePaginatedQuery, useQuery } from "src/core/rpc-client"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import Layout from "src/core/layouts/Layout"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import { getDreams } from "src/dreams/client"
import React, { Fragment, Suspense, useMemo } from "react"
import titleSearch from "public/assets/title-search.png"
import sheepSearch from "public/assets/sheep-search.png"
import { Button, Container, Grid, Typography, Box } from "@mui/material"
import { DreamTime, DreamType, RecallTime, Symbol } from "db"
import { DreamList } from "src/dreams/components/DreamList"
import { DreamSearchForm } from "src/dreams/components/DreamSearchForm"
import { getSymbols } from "src/symbols/client"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import { ITEMS_PER_PAGE } from "src/core/constants/general"
import {
  buildDreamSearchWhere,
  parseDreamSearchQuery,
  safeDecodeURI,
} from "src/dreams/utils/buildDreamSearchWhere"

export const SearchList = () => {
  const router = useRouter()
  const page = Number(router.query.page) || 1
  const [{ dreams, count }, { isLoading, refetch }] = usePaginatedQuery(getDreams, {
    orderBy: { id: "desc" },
    skip: ITEMS_PER_PAGE * (page - 1),
    take: ITEMS_PER_PAGE,
    where: buildDreamSearchWhere(parseDreamSearchQuery(router.query)),
  })
  function onPageChange(_, page: number) {
    router.push({ query: { ...router.query, page: page } })
  }
  return (
    <Fragment>
      <Typography variant="h4" sx={{ color: "white", mb: 1 }} component="p">
        {count} results
      </Typography>
      <DreamList
        isLoading={isLoading}
        dreams={dreams}
        count={count}
        page={page}
        itemPerPage={ITEMS_PER_PAGE}
        refetchList={refetch}
        onPageChange={onPageChange}
        noDreamMessage="No dreams matching your query."
      />
    </Fragment>
  )
}

const SearchPage: BlitzPage = () => {
  const router = useRouter()
  const user = useCurrentUser()
  const [{ symbols }, { isLoading }] = useQuery(getSymbols, {
    where: {
      id: {
        in: parseDreamSearchQuery(router.query).symbolIds,
      },
    },
  })
  const initialValues = useMemo(() => {
    const values = parseDreamSearchQuery(router.query)
    return {
      c: router.query.c ? safeDecodeURI(router.query.c as string) : "",
      q: values.q ?? "",
      favorite: values.favorite ?? "",
      time: values.time as DreamTime[],
      mood: values.mood as number[],
      recall: values.recall as RecallTime[],
      type: values.type as DreamType[],
      symbols: symbols as Symbol[] | [],
    }
  }, [router.query, symbols])

  // the current search filters, in the shared URL param format, for the "View stats" deep link
  const statsQuery = useMemo(() => {
    const keys = ["q", "favorite", "time", "mood", "recall", "type", "symbols"]
    return Object.fromEntries(
      keys.filter((key) => router.query[key]).map((key) => [key, router.query[key] as string])
    )
  }, [router.query])

  function search(data) {
    router.push(
      Routes.SearchPage({
        ...(data.q && { q: encodeURI(data.q as string) }),
        ...(data.favorite && { favorite: encodeURI(data.favorite as string) }),
        ...(data.time.length > 0 && { time: encodeURI(data.time.join(",") as string) }),
        ...(data.mood.length > 0 && { mood: encodeURI(data.mood.join(",") as string) }),
        ...(data.recall.length > 0 && { recall: encodeURI(data.recall.join(",") as string) }),
        ...(data.type.length > 0 && { type: encodeURI(data.type.join(",") as string) }),
        ...(data.symbols.length > 0 && {
          symbols: encodeURI(data.symbols.map((val) => val.id).join(",") as string),
        }),
      })
    )
  }

  return (
    <Fragment>
      <Container>
        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                width: { xs: "50%", sm: "100%" },
                ...(user && {
                  margin: "auto",
                }),
                ...(!user && {
                  margin: { xs: "0 auto -2rem", sm: "auto" },
                }),
              }}
            >
              <Image
                src={sheepSearch}
                alt="dreams sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </Box>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={2} />
          <Grid item md={8}>
            <h1 className="heading">
              <Image src={titleSearch} alt="Search" width="100" height="55" />
              <span className="sr-only">Search</span>
            </h1>

            {!isLoading && (
              <DreamSearchForm
                initialValues={initialValues}
                onSubmit={async (values) => search(values)}
                resetOnInitialValuesChange
              />
            )}

            <Suspense fallback={<LoadingSpiral />}>
              <SearchList />
            </Suspense>

            {/* mirrors the stats page's "View as list": carries the current filters over.
                the stats page defaults to the "all" range for these (search has no range) */}
            {user?.advancedCharting && (
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Link href={Routes.StatsPage(statsQuery)} passHref={true}>
                  <Button variant="contained">View stats</Button>
                </Link>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}
SearchPage.authenticate = true
SearchPage.getLayout = (page) => <Layout title="Search">{page}</Layout>

export default SearchPage
