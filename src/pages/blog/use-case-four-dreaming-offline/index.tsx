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
import RelatedPosts from "src/core/components/RelatedPosts"
import { getRelatedBlogs, type Blog } from "src/pages/api/blog/get-blogs"
import type { GetStaticProps } from "next"
import Image from "next/image"
import blogOffline from "public/assets/screenshot-use-case-four-dreaming-offline.png"
import Link from "next/link"

const ArticlePageUseCaseFourDreamingOffline: BlitzPage<{ related: Blog[] }> = ({ related }) => {
  return (
    <Fragment>
      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              sheepHref={Routes.BlogPage()}
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
            sheepHref={Routes.BlogPage()}
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
              <CardHeader title="Use case four: Dreaming offline" className="pb-0" component="h1" />
              <CardHeader subheader="Sun Sep 27 2026" className="py-0" />
              <CardContent>
                <Image
                  src={blogOffline}
                  alt="the offline sheep"
                  width={900}
                  height={692}
                  className="w-full h-auto"
                />
                <Typography variant="body1" className="mb-4">
                  Remember{" "}
                  <Link href={Routes.ArticlePageUseCaseTwoAddToHomeScreen()} passHref={true}>
                    use case two
                  </Link>
                  ? Phone by the pillow, airplane mode, a few keywords scribbled at 3 a.m. There was
                  a catch hiding in the parentheses: <em>(for this, you need to be online)</em>.
                  Consider the parentheses removed. <em>dreamingsheep</em>&#32;now works offline:
                  open the app without a signal, land on your journal instead of a sad browser
                  dinosaur, write the dream down and go back to sleep. The dream waits on your
                  device and quietly finds its way home the next time you are connected — in ten
                  minutes, or after a week in the mountains.
                </Typography>
                <Typography variant="body1" className="mb-4">
                  No cloud magic involved{" "}
                  <span className="lucidicon lucidicon-smiley-smiley"></span>. Dreams written
                  offline sit in your browser&apos;s storage, marked <em>waiting to sync</em>
                  &#32;with a little hourglass, one per morning if that is how the week goes. When
                  the connection returns they are sent in the order you dreamt them. Nothing is ever
                  overwritten: offline you can only <em>add</em>&#32;dreams, never edit old ones —
                  so if you also logged one from your laptop in the meantime, both simply end up in
                  the journal. Delete the twin if you managed to dream the same dream twice.
                </Typography>
                <Typography variant="body1" className="mb-4">
                  What works without a signal:
                </Typography>
                <ul>
                  <li>the journal — your recent days, the calendar, and a brand new dream;</li>
                  <li>attaching the symbols you already have (new ones need the mothership);</li>
                  <li>the FAQ and this entire blog, cover images optional.</li>
                </ul>
                <Typography variant="body1" className="mb-4">
                  Stats, search and settings still need the real database and will politely say so.
                  An&#32;
                  <em>offline</em>&#32;ribbon in the corner and a banner tell you which world you
                  are in — and whenever a picture did not make it into your pocket in time, the
                  offline sheep stands in for it. [MAINTAINER: your line about the offline sheep]
                </Typography>
                <Typography variant="body1" className="mb-4">
                  The fine print: the very first visit in a browser has to happen online (that is
                  when the app packs its offline bag), private windows forget everything, and phones
                  — iPhones in particular — may spring-clean an app that has not been opened for
                  about a week, so on a long trip do open it now and then. Your dreams are only ever
                  on your device until they sync; nothing new is collected, as the{" "}
                  <Link href={Routes.PrivacyPolicyPage()} passHref={true}>
                    Privacy policy
                  </Link>
                  &#32;still promises.
                </Typography>
                <Typography variant="body1">
                  Happy offline dreaming — and if your dreams turn out to have no signal in the
                  mountains either, well, that is rather the point. Long time no sleep!{" "}
                  <span className="lucidicon lucidicon-device"></span>
                </Typography>
              </CardContent>
            </Card>

            <RelatedPosts blogs={related} />
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageUseCaseFourDreamingOffline.authenticate = false
ArticlePageUseCaseFourDreamingOffline.getLayout = (page) => (
  <Layout
    title="Use case four: Dreaming offline"
    description="dreamingsheep now works offline: open the journal without a signal, write the dream down, and it quietly syncs the next time you are connected."
    ogCoverImage={blogOffline.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

// the related posts are read from the articles' data.md at BUILD time, so these pages
// stay the prerendered .html they have always been (see getRelatedBlogs)
export const getStaticProps: GetStaticProps = async () => ({
  props: { related: getRelatedBlogs("use-case-four-dreaming-offline") },
})

export default ArticlePageUseCaseFourDreamingOffline
