import Image from "next/image"
import { useRouter } from "next/router"
import { usePaginatedQuery, useQuery } from "@blitzjs/rpc"
import { BlitzPage, Routes } from "@blitzjs/next"
import Layout from "src/core/layouts/Layout"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import getDreams from "src/dreams/queries/getDreams"
import React, { Fragment, Suspense, useMemo } from "react"
import titleSearch from "public/assets/title-search.png"
import sheepSearch from "public/assets/sheep-search.png"
import { Container, Grid, Typography, Box } from "@mui/material"
import { DreamTime, DreamType, RecallTime, Symbol } from "db"
import { DreamList } from "src/dreams/components/DreamList"
import { DreamSearchForm } from "src/dreams/components/DreamSearchForm"
import getSymbols from "src/symbols/queries/getSymbols"
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
      <Typography variant="h4" sx={{ color: "white" }} component="p">
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
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}
SearchPage.authenticate = true
SearchPage.getLayout = (page) => <Layout title="Search">{page}</Layout>

export default SearchPage
