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
import sheepStats from "public/assets/sheep-stats.png"
import screenshotUseCaseThree from "public/assets/screenshot-use-case-three-off-the-charts.png"
import Link from "next/link"

const ArticlePageUseCaseThreeOffTheCharts: BlitzPage<{ related: Blog[] }> = ({ related }) => {
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
              <CardHeader title="Use case three: Off the charts" className="pb-0" component="h1" />
              <CardHeader subheader="Thu Jul 2 2026" className="py-0" />
              <CardContent>
                <Image
                  src={screenshotUseCaseThree}
                  alt="Advanced charting on the Stats page"
                  width={736}
                  height={736}
                  className="w-full h-auto"
                />
                <Typography variant="body1" className="mb-4">
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" className="mb-4">
                  Way back in{" "}
                  <Link href={Routes.ArticlePageUseCaseTwoAddToHomeScreen()}>
                    Use case two: Add to home screen
                  </Link>{" "}
                  we told you to{" "}
                  <em>&quot;keep an eye on the Stats page as those charts come to life&quot;</em>.
                  Consider this the awakening¹.
                </Typography>
                <Typography variant="body1" className="mb-4">
                  There is a new <strong>Advanced charting</strong> switch waiting for you in{" "}
                  <em>&#47;settings</em>. Flip it, wander over to <em>&#47;stats</em>, and your
                  dream garden turns into a criss-cross laboratory: type a keyword, toggle a mood,
                  handpick a symbol — and every chart on the page redraws around your question.
                </Typography>
                <Typography variant="body1" className="mb-4">
                  What kind of questions, you ask? The kind only you can ask about your own dreams:
                </Typography>
                <Typography variant="body1" component="div">
                  <ul>
                    <li>
                      Pick the <span className="lucidicon-unicorn"></span> unicorn symbol and see
                      whether unicorns prefer to visit at night or sneak into your afternoon
                      daydreams — and whether they arrive in crisp high definition or pleasantly
                      blurry.
                    </li>
                    <li>
                      Toggle the <span className="lucidicon-smiley-scarry"></span> grumpy smileys
                      and find out which symbols keep bad company — the usual suspects lurking in
                      your low-mood dreams might surprise you.
                    </li>
                    <li>
                      Select the <span className="lucidicon-eye"></span> lucid type and check the
                      sleep chart above: do your lucid adventures show up on long, lazy nights or
                      after a short power nap?
                    </li>
                  </ul>
                </Typography>
                <Typography variant="body1" className="mb-4">
                  Speaking of sleep: remember the <em>&quot;(future-feature)&quot;</em> note next to
                  the bedtime/wake-up opt-in on the Settings page? The future has officially
                  arrived. Track your bedtime and wake-up time on the <em>&#47;dreams</em>&#32;page
                  and Stats greets you with a full-width sleep chart — bedtime at the bottom,
                  wake-up at the top, your night colored in between. Nights you don&apos;t track
                  simply stay blank; the sheep doesn&apos;t judge².
                </Typography>
                <Typography variant="body1" className="mb-4">
                  And in case you are wondering: no, we still won&apos;t tell you what any of it{" "}
                  <em>means</em>. As promised in{" "}
                  <Link href={Routes.ArticlePageBackstoryTheBeginnings()}>
                    Backstory - the beginnings
                  </Link>
                  , <em>dreamingsheep</em> remains a neu(t)ral tool: the charts do the showing, your
                  intuition does the interpreting.
                </Typography>
                <Typography variant="body1" className="mb-4">
                  Now go log a dream, flip the switch, and cross-examine your subconscious. Sweet
                  dreams!
                </Typography>
                <Typography variant="body1" className="mb-4">
                  Meh!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>1 - no alarm clocks were harmed in the making of these charts</small>
                  <br />
                  <small>
                    2 - night-shift workers and <span className="lucidicon-dracula"></span> vampires
                    are fully supported (for you, the midnight line is merely a suggestion)
                  </small>
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

ArticlePageUseCaseThreeOffTheCharts.authenticate = false
ArticlePageUseCaseThreeOffTheCharts.getLayout = (page) => (
  <Layout
    title="Use case three: Off the charts"
    description="Interactive stats have arrived: flip one switch in Settings and your dream charts become a criss-cross laboratory of symbols and filters."
    ogCoverImage={sheepStats.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

// the related posts are read from the articles' data.md at BUILD time, so these pages
// stay the prerendered .html they have always been (see getRelatedBlogs)
export const getStaticProps: GetStaticProps = async () => ({
  props: { related: getRelatedBlogs("use-case-three-off-the-charts") },
})

export default ArticlePageUseCaseThreeOffTheCharts
