import { Routes } from ".blitz"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import titleBlog from "public/assets/title-blog.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { BlitzPage } from "@blitzjs/next"
import Head from "next/head"
import Image from "next/image"
// TODO: swap to the matrix-sheep cover once available, e.g.:
// import blogMatrixSheep from "public/assets/blog-matrix-sheep.jpg"
import blogMatrixSheep from "public/assets/sheep-recall.png"
import Link from "next/link"

const ArticlePageDreamingsheepIsNowOpenSource: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>dreamingsheep is now open source | dreamingsheep</title>
      </Head>

      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              imageComponent={
                <Image
                  src={sheepRecall}
                  alt="blog sheep"
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
                src={sheepRecall}
                alt="blog sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            }
          />
        </Suspense>
        <Grid container>
          <Grid item md={2} />
          <Grid item md={8}>
            <div className="heading">
              <Image src={titleBlog} alt="Blog" width="63" height="55" />
            </div>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="dreamingsheep is now open source"
                className="pb-0"
                component="h1"
              />
              {/* TODO: update the date to the actual launch day */}
              <CardHeader subheader="TBD" className="py-0" />
              <CardContent>
                <Image
                  src={blogMatrixSheep}
                  alt="a sheep escaping the matrix"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
                <Typography variant="body1" align="right">
                  ¹
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  After much deliberation (and a few prophetic dreams about pull requests),{" "}
                  <em>dreamingsheep</em> has officially taken the red pill² and gone open source!
                  The code now lives at{" "}
                  <Link href="https://github.com/talpitoo/dreamingsheep">
                    github.com/talpitoo/dreamingsheep
                  </Link>{" "}
                  for everyone to read, study, and contribute to.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Why?</strong> Because dreams are better when shared — well, the{" "}
                  <em>code</em> behind them, anyway. Your actual dreams remain yours alone (we
                  promise, see the <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>).
                  This is a small, one-person passion project that has been quietly humming along
                  since 2023, and opening it up feels like the natural next step.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Here&apos;s what changes (and what doesn&apos;t):
                </Typography>
                <Typography variant="body1" component="div">
                  <ul>
                    <li>
                      <strong>https://dreamingsheep.net stays exactly the same</strong> — same free
                      service, same sheep, same cookies for the{" "}
                      <Link href="https://en.wikipedia.org/wiki/Cookie_Monster">
                        Cookie Monster
                      </Link>
                    </li>
                    <li>
                      <strong>The code is now public</strong> — bug reports, pull requests, and
                      thoughtful suggestions are welcome
                    </li>
                    <li>
                      <strong>You cannot deploy your own dreamingsheep</strong> — the{" "}
                      <Link href="https://github.com/talpitoo/dreamingsheep/blob/main/LICENSE.txt">
                        license
                      </Link>{" "}
                      is &quot;source available&quot;, not MIT. There&apos;s only one official
                      flock, and it grazes here.
                    </li>
                    <li>
                      <strong>The roadmap is public</strong> — see{" "}
                      <Link href="https://github.com/talpitoo/dreamingsheep/blob/main/ROADMAP.md">
                        ROADMAP.md
                      </Link>{" "}
                      for what&apos;s coming and where help is wanted
                    </li>
                  </ul>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  If you&apos;re a developer who likes dreams (or a dreamer who likes code), have a
                  look at the{" "}
                  <Link href="https://github.com/talpitoo/dreamingsheep/issues">open issues</Link> —
                  especially the ones tagged <code>good first issue</code>. Tailwind migration, unit
                  tests, accessibility improvements: pick your poison{" "}
                  <span className="lucidicon lucidicon-scream"></span>.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  A small disclaimer: the maintainer (
                  <Link href="https://github.com/talpitoo">@talpitoo</Link>) is primarily a frontend
                  developer, so backend PRs will be reviewed with extra paranoia and a lot of{" "}
                  <em>&quot;wait, what does this do again?&quot;</em>. Be patient, document well,
                  and we&apos;ll get there together.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No new soul-stealing clauses were added in the process — that part was already
                  covered in the <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>{" "}
                  bwahaha!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Now go log a dream. Or fix a bug. Or both. Sweet dreams!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Meh!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>1 - cover photo: a sheep escaping the matrix (made by yours truly)</small>
                  <br />
                  <small>
                    2 - The Matrix (1999) — although in our case, the red pill is just a{" "}
                    <code>git push</code>
                  </small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageDreamingsheepIsNowOpenSource.authenticate = false
ArticlePageDreamingsheepIsNowOpenSource.getLayout = (page) => (
  <Layout ogCoverImage={ogCoverImageBlog.src}>{page}</Layout>
)

export default ArticlePageDreamingsheepIsNowOpenSource
