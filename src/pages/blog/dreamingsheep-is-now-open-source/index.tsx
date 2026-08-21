import { Routes } from "src/routes"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import titleBlog from "public/assets/title-blog.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { AppPage as BlitzPage } from "src/core/types"
import Image from "next/image"
import blogMatrixSheep from "public/assets/sheep-matrix.jpg"
import Link from "next/link"

const ArticlePageDreamingsheepIsNowOpenSource: BlitzPage = () => {
  return (
    <Fragment>
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
          <Grid item md={2} className="grid-spacer-md-2" />
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
              <CardHeader subheader="Sun May 3 2026" className="py-0" />
              <CardContent>
                <Image
                  src={blogMatrixSheep}
                  alt="a sheep escaping the matrix"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  After much deliberation, <em>dreamingsheep</em> has officially taken the red pill¹
                  and gone open source! The code now lives at{" "}
                  <Link href="https://github.com/talpitoo/dreamingsheep">
                    github.com/talpitoo/dreamingsheep
                  </Link>{" "}
                  for everyone to read, study, and contribute to.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Why?</strong> Because dreams are more fun when shared. Your actual dreams
                  remain yours alone (see the{" "}
                  <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>). This is a
                  one-person passion project, 20+ years of hard procrastination and casual work (
                  <Link href={Routes.ArticlePageBackstoryTheBeginnings()}>
                    Backstory - the beginnings
                  </Link>{" "}
                  and{" "}
                  <Link href={Routes.ArticlePageLifePurposeMilestoneOne()}>
                    Life purpose, milestone #1
                  </Link>
                  ), which finally came alive online in 2023. Opening it up feels like the natural
                  next step — already{" "}
                  <Link href={Routes.ArticlePageSupportUsOnPatreon()}>hinted at</Link> when we mused
                  about <em>dreamingsheep</em>&#32;one day becoming a self-sustaining AI in the
                  &lsquo;astral&rsquo; cloud. Well, the cloud part is happening — minus the
                  sentience (for now).
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Here&apos;s what changes (and what doesn&apos;t):
                </Typography>
                <Typography variant="body1" component="div">
                  <ul>
                    <li>
                      <strong>https://dreamingsheep.net stays exactly the same</strong> — same free
                      service, same sheep, same cookies for the{" "}
                      <Link href={Routes.PrivacyPolicyPage()}>Cookie Monster</Link>
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
                  </ul>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  If you&apos;re a developer who likes dreams (or a dreamer who likes code), have a
                  look at the{" "}
                  <Link href="https://github.com/talpitoo/dreamingsheep/issues">open issues</Link>,{" "}
                  or the{" "}
                  <Link href="https://github.com/talpitoo/dreamingsheep/blob/main/ROADMAP.md">
                    ROADMAP.md
                  </Link>{" "}
                  for what&apos;s coming and where help is wanted.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  A small disclaimer: the maintainer (
                  <Link href="https://github.com/talpitoo">@talpitoo</Link>) is primarily a frontend
                  developer, so backend PRs may take a little longer to review. Be patient, document
                  well, and we&apos;ll get there together.
                </Typography>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  Now go log a dream. Or fix a bug. Or both. Sweet dreams!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Meh!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - The Matrix (1999) — although in our case, the red pill is just a{" "}
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
  <Layout
    title="dreamingsheep is now open source"
    description="dreamingsheep took the red pill and went open source: read, study and contribute to the dream journal's code on GitHub."
    ogCoverImage={blogMatrixSheep.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageDreamingsheepIsNowOpenSource
