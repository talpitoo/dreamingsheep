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
import sheepStats from "public/assets/sheep-stats.png"
import Link from "next/link"

const ArticlePageUseCaseThreeOffTheCharts: BlitzPage = () => {
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
          <Grid item md={2} />
          <Grid item md={8}>
            <div className="heading">
              <Image src={titleBlog} alt="Blog" width="63" height="55" />
            </div>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Use case three: Off the charts" className="pb-0" component="h1" />
              <CardHeader subheader="Thu Jul 2 2026" className="py-0" />
              <CardContent>
                <Image
                  src={sheepStats}
                  alt="the stats sheep contemplating a pie chart"
                  width={384}
                  height={384}
                  className="w-full h-auto"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Way back in{" "}
                  <Link href={Routes.ArticlePageUseCaseTwoAddToHomeScreen()}>use case two</Link> we
                  told you to{" "}
                  <em>&quot;keep an eye on the Stats page as those charts come to life&quot;</em>.
                  Consider this the awakening¹.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  There is a new <strong>Advanced charting</strong> switch waiting for you in{" "}
                  <Link href={Routes.SettingsPage()}>&#47;settings</Link>. Flip it, wander over to{" "}
                  <Link href={Routes.StatsPage()}>&#47;stats</Link>, and your dream garden turns
                  into a criss-cross laboratory: type a keyword, toggle a mood, handpick a symbol —
                  and every chart on the page redraws around your question, while you watch.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
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
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Speaking of sleep: remember the <em>&quot;(future-feature)&quot;</em> note next to
                  the bedtime/wake-up opt-in on the Settings page? The future has officially
                  arrived. Track your bedtime and wake-up time on the{" "}
                  <Link href={Routes.DreamsPage()}>&#47;dreams</Link> page and Stats greets you with
                  a full-width sleep chart — bedtime at the bottom, wake-up at the top, your night
                  colored in between. Nights you don&apos;t track simply stay blank; the sheep
                  doesn&apos;t judge².
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  And in case you are wondering: no, we still won&apos;t tell you what any of it{" "}
                  <em>means</em>. As promised in{" "}
                  <Link href={Routes.ArticlePageBackstoryTheBeginnings()}>the backstory</Link>,
                  dreamingsheep remains a neu(t)ral tool — the charts do the showing, your intuition
                  does the interpreting.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Now go log a dream, flip the switch, and cross-examine your subconscious. Sweet
                  dreams!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Meh!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>1 - no alarm clocks were harmed in the making of these charts</small>
                  <br />
                  <small>
                    2 - night-shift workers and <span className="lucidicon-dracula"></span> vampires
                    are fully supported — for you, the midnight line is merely a suggestion
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

export default ArticlePageUseCaseThreeOffTheCharts
