import { GetServerSideProps } from "next"
import { getSession } from "src/auth/session"
import Link from "next/link"
import Head from "next/head"
import Image from "next/image"
import { InferGetServerSidePropsType } from "next"
import { useRouter } from "next/router"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import Layout from "src/core/layouts/Layout"
import sheepDreamingsheep from "public/assets/sheep-dreamingsheep.png"
import sheepDream from "public/assets/sheep-dream.png"
import { Box, Container, Grid, Card, CardContent, Typography } from "@mui/material"
import moment from "moment"
import { DreamType } from "db"
import db from "db"
import SwiperScreenshots, { SwiperDemoButton } from "src/core/components/SwiperScreenshots"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { Fragment, Suspense } from "react"
import LoadingSpiral from "src/core/components/LoadingSpiral"

// structured data for search engines — kept to plain facts, no review/rating fluff
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "dreamingsheep",
  url: "https://dreamingsheep.net/",
  description: "dreamingsheep, an online journal for your dreams and beyond",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}

const Home: BlitzPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({
  lastMonthDreamsCount,
  lastMonthLucidCount,
  topSymbols,
  unicornDreamsCount,
}) => {
  const router = useRouter()

  return (
    <Fragment>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </Head>
      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              imageComponent={
                <Image
                  src={sheepDreamingsheep}
                  alt="dreamingsheep"
                  width={384}
                  height={384}
                  className="w-full h-auto"
                />
              }
            />
          }
        >
          <AuthenticationContainer
            imageComponent={
              <Image
                src={sheepDreamingsheep}
                alt="dreamingsheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            }
            // landing page only: the h1 + intro ride along inside the login card so
            // they are server-rendered (no JS needed to read them)
            headerComponent={
              <Fragment>
                <h1 className="text-2xl font-normal mb-4">
                  An online journal for your dreams and beyond¹
                </h1>
                <p className="mb-4">
                  <em>Dreamingsheep</em> is an online journal for your dreams and beyond¹. To learn
                  more, read the <em>Five Ws</em> on the{" "}
                  <Link href={Routes.FaqPage()} passHref={true}>
                    FAQ
                  </Link>{" "}
                  page and browse the{" "}
                  <Link href={Routes.BlogPage()} passHref={true}>
                    Blog
                  </Link>
                  .
                </p>
              </Fragment>
            }
            // scrolls down to the #demo collage (plain anchor, so it works without JS);
            // the collage has its own prev/next arrows now
            footerComponent={<SwiperDemoButton />}
          />
        </Suspense>

        <Grid container className="justify-center">
          <SwiperScreenshots />
          {/* the explainer-video iframe that lived here (commented out) for years now plays for
              real in the blog: /blog/the-explainer-video-is-still-in-the-works
              NOTE: old/removed A/B video https://www.youtube-nocookie.com/embed/UwJvuo37dMw
              NOTE full embed snippet https://gitlab.com/talpitoo/dreamingsheep/-/issues/116 */}
        </Grid>

        <Grid container>
          <Grid item md={2} className="grid-spacer-md-2"></Grid>
          <Grid item md={8}>
            <Card className="bg-mui-secondary-light">
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {lastMonthDreamsCount < 1 && (
                    <>
                      No dreams last month{" "}
                      <span className="lucidicon lucidicon-smiley-neutral"></span>
                    </>
                  )}
                  {lastMonthDreamsCount > 0 && (
                    <>
                      Last month we&apos;ve collected <strong>{lastMonthDreamsCount}</strong>{" "}
                      dreams, from which <strong>{lastMonthLucidCount}</strong> were lucid. The top
                      3 themes were{" "}
                      <strong>
                        {topSymbols[0]?.name !== undefined && topSymbols[0]?.name !== ""
                          ? topSymbols[0]?.name
                          : "n/a"}
                        ,{" "}
                        {topSymbols[1]?.name !== undefined && topSymbols[1]?.name !== ""
                          ? topSymbols[1]?.name
                          : "n/a"}
                      </strong>{" "}
                      and{" "}
                      <strong>
                        {topSymbols[2]?.name !== undefined && topSymbols[2]?.name !== ""
                          ? topSymbols[2]?.name
                          : "n/a"}
                      </strong>
                      . Unicorns <span className="lucidicon lucidicon-unicorn"></span> were
                      encountered <strong>{unicornDreamsCount}</strong>{" "}
                      {unicornDreamsCount === 1 ? "time" : "times"} so far.
                    </>
                  )}
                </Typography>
                {/* <Box sx={{ textAlign: "center", mb: 2 }}>
                <Image src={globalSymbolsExample} alt="chart" width="192" height="174" />
              </Box> */}
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Join us as we watch Replicants³ jump over the fence (and transform into Humans).
                  Let&apos;s dream a better⁴ world together!
                  {/* <span className="lucidicon lucidicon-shine-2"></span> */}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
                  <em>
                    You may say that I&apos;m a dreamer
                    <br />
                    but I&apos;m not the only one
                    <br />
                    I hope someday you&apos;ll join us
                    <br />
                    and the world will be as one.⁵
                  </em>
                </Typography>
                <Box sx={{ textAlign: "center" }}>
                  <Image
                    src={sheepDream}
                    alt="dream sheep"
                    width={368}
                    height={368}
                    className="w-full h-auto max-w-[368px]"
                  />
                </Box>

                <hr />
                <Typography variant="body1">
                  <small>1 - Jupiter and beyond the infinite (2001: A Space Odyssey)</small>
                  <br />
                  <small>
                    2 - forget about the latest iPhones or Pixels, Nexus 5/10 rulez (note for geeks)
                  </small>
                  <br />
                  <small>3 - Blade Runner</small>
                  <br />
                  <small>4 - different version of this already perfect</small>
                  <br />
                  <small>5 - Imagine - John Lennon</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

// NOTE: suppressFirstRenderFlicker was dropped here — it wrapped the whole page in
// `visibility: hidden` until mount, which hid the h1/intro copy from JS-less visitors.
// Nothing is left to hide: getServerSideProps redirects logged-in users away, so this
// page only ever renders its anonymous state, identically on server and client.
Home.getLayout = (page) => (
  <Layout childrenContainerClassName="py-6">
    {/* title="dreamingsheep" */}
    {page}
  </Layout>
)

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // logged-in users go straight to their journal. Server-side replacement for
  // `Home.redirectAuthenticatedTo`, which threw a client-side RedirectError on every
  // login/logo-click and raced the LoginForm's own router.push (console errors, issue #10)
  const session = await getSession(req as any, res as any, { skipCsrf: true })
  if (session.userId) {
    return {
      redirect: { destination: Routes.DreamsPage().pathname, permanent: false },
    }
  }

  const currentMoment = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const lastMonth = {
    gte: currentMoment.clone().subtract(31, "days").toDate(),
    lte: currentMoment.clone().add(1, "days").toDate(),
  }

  // NOTE: aggregate counts ONLY — no dream rows may ever reach this public page
  // (they would be serialized into the HTML; see issue #11 and the FAQ promise)
  const [lastMonthDreamsCount, lastMonthLucidCount, unicornDreamsCount] = await Promise.all([
    db.dream.count({ where: { dreamAt: lastMonth } }),
    db.dream.count({ where: { dreamAt: lastMonth, type: DreamType.LUCID } }),
    db.dream.count({ where: { symbols: { some: { code: "unicorn" } } } }),
  ])

  // top 3 most-used predefined/built-in symbols, counted in Postgres —
  // user-created symbols are explicitly excluded (see the FAQ)
  const topSymbols = await db.$queryRaw<{ id: number; name: string; count: number }[]>`
    SELECT s."id", s."name", COUNT(*)::int AS "count"
    FROM "_DreamToSymbol" ds
    JOIN "Dream" d ON d."id" = ds."A"
    JOIN "Symbol" s ON s."id" = ds."B"
    WHERE s."builtIn" = true
      AND d."dreamAt" >= ${lastMonth.gte}
      AND d."dreamAt" <= ${lastMonth.lte}
    GROUP BY s."id", s."name"
    ORDER BY "count" DESC, s."id" ASC
    LIMIT 3
  `

  return {
    props: {
      lastMonthDreamsCount,
      lastMonthLucidCount,
      topSymbols,
      unicornDreamsCount,
    },
  }
}

export default Home
