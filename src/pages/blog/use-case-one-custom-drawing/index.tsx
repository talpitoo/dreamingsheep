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
import blogUseCaseOneCustomDrawing from "public/assets/blog-the-floating-island-by-araiko-o.jpg"
import Link from "next/link"

const ArticlePageUseCaseOneCustomDrawing: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Use case one: Custom drawing | dreamingsheep</title>
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
              <CardHeader title="Use case one: Custom drawing" className="pb-0" component="h1" />
              <CardHeader subheader="Tue Sep 12 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogUseCaseOneCustomDrawing}
                  alt="The Floating Island by Araiko-O"
                  width={900}
                  height={692}
                  className="w-full h-auto"
                />
                <Typography variant="body1" align="right">
                  ¹
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Have you ever had a dream so vivid, so indescribable, that words alone fail to do
                  justice? With custom symbols, you have the ability to attach your own drawings or
                  images, capturing the dream&apos;s essence more precisely.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  But the possibilities don&apos;t end there. You can employ this feature to curate
                  your own unique categories. Missing the five (or six) senses in the predefined,
                  built-in symbols{" "}
                  <span className="lucidicon lucidicon-split-leaf-philodendron"></span>{" "}
                  <span className="lucidicon lucidicon-detective-agent"></span>{" "}
                  <span className="lucidicon lucidicon-alien"></span>{" "}
                  <span className="lucidicon lucidicon-unicorn"></span>{" "}
                  <span className="lucidicon lucidicon-optical-illusion"></span>? No problem. Create
                  a custom symbol for each, and you&apos;re all set.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  This means that <em>dreamingsheep</em> isn&apos;t confined to dream journaling
                  alone. You can easily transform it into your very own travel journal, chronicling
                  your spacetime adventures.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <em>Right, let&apos;s go adventuring!</em>²
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - cover photo &copy;{" "}
                    <Link href="https://www.deviantart.com/araiko-o/art/The-Floating-Island-177316405">
                      Araiko-O
                    </Link>{" "}
                    - The Floating Island
                  </small>
                  <br />
                  <small>2 - quote from Tomb Raider 1</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageUseCaseOneCustomDrawing.authenticate = false
ArticlePageUseCaseOneCustomDrawing.getLayout = (page) => (
  <Layout
    ogCoverImage={blogUseCaseOneCustomDrawing.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageUseCaseOneCustomDrawing
