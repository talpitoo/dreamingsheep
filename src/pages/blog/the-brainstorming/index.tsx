import Image from "next/image"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import blogBrainstorming from "public/assets/blog-brainstorming.png"
import titleBlog from "public/assets/title-blog.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { AppPage as BlitzPage } from "src/core/types"

const ArticlePageTheBrainstorming: BlitzPage = () => {
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
              <CardHeader title="The brainstorming" className="pb-0" component="h1" />
              <CardHeader subheader="Fri Apr 7 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogBrainstorming}
                  alt="an early draft of dreamingsheep"
                  width={1349}
                  height={1701}
                  className="w-full h-auto"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  The challenge was to create an app that would be the go-to dream journal for
                  dreamers of all colors: generic enough to cover a broad range of use cases, yet
                  with opinionated defaults to make it simple, fun, and intuitive for newcomers. In
                  the upcoming blog posts, some of these use cases will be expanded on.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  I had some initial ideas and sketches, but once i received the sheep mascot, it
                  was so good that i immediately discarded any ideas of fancy UI libraries and
                  decided to keep the rest of the layout minimalistic and low-key, resembling a
                  suprematist¹ painting.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  The hardest nut to crack was the dream types. Trying to categorize dream (and in
                  general, consciousness) states is a futile quest. If i had spent all my time
                  pondering it, dreamingsheep would still be in the works today. So don&apos;t take
                  the categories too seriously, but let your dreams roam free, unbounded by labels
                  and classifications.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Many hours were spent brainstorming whether to enable public dreams. Similar
                  websites have either a forum or you can interpret each other&apos;s dreams.
                  However, here the focus is on your personal journey. The intention wasn&apos;t to
                  create a community to entertain each other, but rather to encourage you to pull up
                  your sleeves and dream yourself up to the <em>‘next dimension’</em>. Then we can
                  meet and party all night in the <em>‘astral realm’</em>.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  TL;DR: no likes, no <em>seen</em>, no distractions!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - an abstract art based upon “the supremacy of pure artistic feeling” rather
                    than on visual depiction of objects (Malevich, Kazimir)
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

ArticlePageTheBrainstorming.authenticate = false
ArticlePageTheBrainstorming.getLayout = (page) => (
  <Layout
    title="The brainstorming"
    description="Designing the go-to dream journal for dreamers of all colors: generic enough for every use case, opinionated enough to stay simple and fun."
    ogCoverImage={blogBrainstorming.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageTheBrainstorming
