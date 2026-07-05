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
import Image from "next/image"
import Link from "next/link"

const ArticlePageBackstoryTheBeginnings: BlitzPage = () => {
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
              <CardHeader title="Backstory - the beginnings" className="pb-0" component="h1" />
              <CardHeader subheader="Tue Jan 3 2023" className="py-0" />
              <CardContent>
                <Image
                  src="https://images.pexels.com/photos/4506259/pexels-photo-4506259.jpeg?w=1472"
                  alt="© Karolina Grabowska - Funny couple with carton boxes on heads"
                  width={736}
                  height={1104}
                  className="w-full h-auto"
                />
                <Typography variant="body1" align="right">
                  ¹
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  And Now for Something Completely Different²...
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  It&apos;s been more than 20 years since i³ have learnt that lucid dreams are a
                  thing. It all started with running away from monsters while simultaneously
                  becoming aware that i am dreaming, trying to wake up from those nightmares{" "}
                  <span className="lucidicon lucidicon-scream"></span>. Years later, i discovered{" "}
                  <Link href="http://www.lucidity.com/">Stepen LaBerge</Link>&apos;s book{" "}
                  <Link href="https://www.amazon.com/Exploring-World-Dreaming-Stephen-LaBerge/dp/034537410X">
                    Exploring the World of Lucid Dreaming
                  </Link>{" "}
                  from which i&apos;ve learnt to take control, chase away and finally befriend the
                  monsters.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  While some people have lucid dreams quite often spontaneously, for others it
                  requires determination, focus, and practice. After some initial success, my lucid
                  dreams subsided, and it was time to do something about it.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To strengthen my dream recall i started journaling in a ‘Word’ document and soon
                  realized that it would be much more convenient if i could use an app instead. With
                  due respect to other dreamjournaling software, for what i intended, they were
                  either too generic or new age-y{" "}
                  <span className="lucidicon lucidicon-dolphin"></span>. I needed less{" "}
                  <em>“fallen out tooth mean X, black crow means Y”</em> and more statistical
                  analysis, a way to discover the emerging patterns in the subconscious. I wanted a
                  neu(t)ral tool that would leave the leading role in dream interpretation to the
                  user&apos;s intuition.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  The challenge was to create a journaling software that could accommodate various
                  use case scenarios, but with “opinionated” defaults to make it more fun to use.
                  The brainstorming began.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To be continued in part 2:{" "}
                  <Link href={Routes.ArticlePageLifePurposeMilestoneOne()}>
                    Life purpose, milestone #1
                  </Link>
                  ...
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - cover photo &copy; Karolina Grabowska - Funny couple with carton boxes on
                    heads
                  </small>
                  <br />
                  <small>2 - Monty Python&apos;s Flying Circus</small>
                  <br />
                  <small>3 - the lone wolf in the dreamingsheep skin</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageBackstoryTheBeginnings.authenticate = false
ArticlePageBackstoryTheBeginnings.getLayout = (page) => (
  <Layout
    title="Backstory - the beginnings"
    description="How 20+ years of lucid dreams, notebooks and monsters-chasing-me nights turned into dreamingsheep — the backstory of an online dream journal."
    ogCoverImage="https://images.pexels.com/photos/4506259/pexels-photo-4506259.jpeg?w=1472"
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageBackstoryTheBeginnings
