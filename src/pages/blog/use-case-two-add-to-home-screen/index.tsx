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
import blogUseCaseTwoAddToHomeScreen from "public/assets/blog-add-to-home-screen.jpg"
import Link from "next/link"

const ArticlePageUseCaseTwoAddToHomeScreen: BlitzPage = () => {
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
              <CardHeader
                title="Use case two: Add to home screen"
                className="pb-0"
                component="h1"
              />
              <CardHeader subheader="Sun Oct 22 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogUseCaseTwoAddToHomeScreen}
                  alt="The Floating Island by Araiko-O"
                  width={900}
                  height={692}
                  className="w-full h-auto"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  You can add <em>dreamingsheep</em> to your home screen and use it just like an
                  app, minus the tracking of your personal data, which is an inseparable part of the
                  app ecosystem. We&apos;re going to <em>“steal your soul”</em> anyway{" "}
                  <span className="lucidicon lucidicon-smiley-smiley"></span>, as explicitly stated
                  in the{" "}
                  <Link href={Routes.PrivacyPolicyPage()} passHref={true}>
                    Privacy policy
                  </Link>
                  . This way, you can keep your phone by your pillow (of course, in airplane mode to
                  keep your sweet dreams undisturbed) in case you awaken in the middle of the night.
                  Then, record a few initial keywords right away while your memories are fresh (for
                  this, you need to be online). Later, while sipping your morning coffee and
                  indulging in cherry pie, log in from your laptop to fill in the gaps, correct any
                  typos, or, who knows, maybe they were intentional? Attach symbols, arrange your
                  dream garden, and keep an eye on the Stats page as those charts come to life.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To add the app to the home screen:
                </Typography>
                <ul>
                  <li>Open the your favorite browser on your device.</li>
                  <li>Visit the dreamingsheep website.</li>
                  <li>Tap the share/three-dot menu icon somewhere in the corner.</li>
                  <li>Select “Add to Home screen.”</li>
                  <li>Name the app if prompted and tap “Add.”</li>
                </ul>
                <Typography variant="body1">
                  Remember that the exact steps may vary slightly depending on your device and
                  browser version, but these instructions should work for most up-to-date versions
                  of the popular browsers. Happy <em>&apos;addtohomescreening&apos;</em>!{" "}
                  <span className="lucidicon lucidicon-device"></span>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageUseCaseTwoAddToHomeScreen.authenticate = false
ArticlePageUseCaseTwoAddToHomeScreen.getLayout = (page) => (
  <Layout
    title="Use case two: Add to home screen"
    description="Add dreamingsheep to your home screen and use the dream journal like an app — minus the tracking that usually comes with the app ecosystem."
    ogCoverImage={blogUseCaseTwoAddToHomeScreen.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageUseCaseTwoAddToHomeScreen
