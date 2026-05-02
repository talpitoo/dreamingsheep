import { Routes } from ".blitz"
import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography, Box } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import titleBlog from "public/assets/title-blog.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import { BlitzPage } from "@blitzjs/next"

const ArticlePageLifePurposeMilestoneOne: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Life purpose, milestone #1 | dreamingsheep</title>
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
              <CardHeader title="Life purpose, milestone #1" className="pb-0" component="h1" />
              <CardHeader subheader="Wed Jan 4 2023" className="py-0" />
              <CardContent>
                <Image
                  src="https://images.tothtamas.tt/weblog/iceland/toth-tamas-iceland-11.jpg"
                  alt="Iceland"
                  width={1600}
                  height={1067}
                  className="w-full h-auto"
                />
                {/* https://images.pexels.com/photos/35857/amazing-beautiful-breathtaking-clouds.jpg?w=1472 */}
                <Typography variant="body1" align="right">
                  ¹
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  After more than 20+ years of hard procrastination and casual work²,{" "}
                  <strong>dreamingsheep</strong> is finally online!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  I am grateful to everyone who helped make this project a reality. Special thanks
                  to:
                  <ul>
                    <li>
                      <Link href="https://github.com/nmilinkovic">@nmilinkovic</Link> for the early
                      backend explorations i had no clue about,
                    </li>
                    <li>
                      <Link href="https://www.lasloantal.com/">@laslo.antal</Link> for the ingenious
                      sheep design that i fell in love with from the start,
                    </li>
                    <li>
                      <Link href="https://github.com/adamshovav">@adamshovav</Link> from{" "}
                      <Link href="https://thedreamers.us/">Dreamers Inc.</Link> and his backend
                      team, especially <Link href="https://github.com/zbrukas">@zbrukas</Link> for
                      the insigtful technology stack choice, the CRUD skeleton and all things
                      devops; and <Link href="https://github.com/rachelpurba">@rachelpurba</Link>{" "}
                      for her enthusiasm in tackling the never-ending requirements until the very
                      last pixels were in place.
                    </li>
                    <li>
                      My university professors, Đorđe Herceg, PhD, who didn&apos;t accept a first
                      draft of the project as my diploma work in its early phase and Miloš Racković,
                      PhD, who did.
                    </li>
                    <li>
                      A special shoutout to OpenAI&apos;s{" "}
                      <Link href="https://chat.openai.com/">ChatGPT</Link> for the proofreading and
                      grammar assistance.
                    </li>
                    <li>
                      Last but not least,{" "}
                      <Link href="http://www.lucidity.com/">Stepen LaBerge, PhD</Link>, whose
                      research and book{" "}
                      <Link href="https://www.amazon.com/Exploring-World-Dreaming-Stephen-LaBerge/dp/034537410X">
                        Exploring the World of Lucid Dreaming
                      </Link>{" "}
                      inspired it all.
                    </li>
                  </ul>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  After falling in love with lucid dreaming (see part 1:{" "}
                  <Link href={Routes.ArticlePageBackstoryTheBeginnings()}>
                    Backstory - the beginnings
                  </Link>
                  ) i knew that i wanted to create an online dream journal. But one day, during a
                  flash of insight while washing dishes, it occurred to me that it was indeed my{" "}
                  <em>life purpose</em> (milestone #1 :-), however cliche that might sound.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}></Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  My idea back then was that the world is hurtling toward a dystopian future with no
                  humans in it but <em>dreamingsheep</em> would survive ’in the cloud’. Some future
                  androids/replicants³ who stumble upon it in the information-ocean might start
                  scratching their heads after discovering that in the past there lived some kind of
                  humans who were capable of ’dreaming’. That would trigger an irreversible switch
                  in their algorithm starting to doubt their own programming. The rest of the story
                  and its variations are familiar...
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Since then, many things have changed and the current status quo is that regardless
                  of utopia or dystopia, the show must go on⁴.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  I never would have imagined what doors (of perception⁵) would open by following my
                  dreams over the years. Now, after milestone #1 has been completed, the journey has
                  just begun!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <Link href="/">Sign up</Link> and follow your dreams!
                </Typography>
                {/* <Typography variant="body1" sx={{ mb: 2 }}>
                  Sincerely,
                  <br />
                  <Link href="https://github.com/talpitoo">@talpitoo</Link>
                  <br />
                  CDO (Chief Dreaming Officer) of dreamingsheep
                </Typography> */}
                <hr />
                <Typography variant="body1">
                  <small>1 - cover photo &copy; Tóth Tamás</small>
                  {/* Pixabay - Brown Leafed Tree on Open Field Under White Clouds and Blue Sky */}
                  <br />
                  <small>
                    2 - not your typical ’fail fast, iterate quickly’ software release cycle
                  </small>
                  <br />
                  <small>3 - Blade Runner</small>
                  <br />
                  <small>4 - Queen</small>
                  <br />
                  <small>5 - Aldous Huxley - The Doors of Perception</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageLifePurposeMilestoneOne.authenticate = false
ArticlePageLifePurposeMilestoneOne.getLayout = (page) => (
  <Layout ogCoverImage={ogCoverImageBlog.src}>{page}</Layout>
)

export default ArticlePageLifePurposeMilestoneOne
