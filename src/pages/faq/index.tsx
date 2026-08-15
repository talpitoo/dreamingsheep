import Link from "next/link"
import Image from "next/image"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import {
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Button,
  Box,
} from "@mui/material"
import sheepFaq from "public/assets/sheep-faq.png"
import ogCoverImageFaq from "public/assets/cover1200x630-faq.jpg"
import titleFaq from "public/assets/title-faq.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"

const FaqPage: BlitzPage = () => {
  return (
    <Fragment>
      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              imageComponent={
                <Image
                  src={sheepFaq}
                  alt="FAQ sheep"
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
                src={sheepFaq}
                alt="FAQ sheep"
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
            <h1 className="heading">
              <Image src={titleFaq} alt="FAQ" width="68" height="55" />
              <span className="sr-only">FAQ</span>
            </h1>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Who?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  Dreamingsheep is your virtual assistant keeping track of your (
                  <Link href="https://en.wikipedia.org/wiki/Lucid_dream">
                    lucid <span className="lucidicon-eye"></span>
                  </Link>
                  ) dreams, or in broader terms, your altered states of consciousness{" "}
                  <span className="lucidicon-meditation"></span>
                  <span className="lucidicon-mushroom"></span>.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="What?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  It is an{" "}
                  <strong>
                    <em>online dream journal</em>
                  </strong>{" "}
                  where you can log and analyze your dreams. Find connections in your dream patterns
                  like mood, theme, recall, sleep cycle, repeating symbols{" "}
                  <span className="lucidicon-unicorn"></span> and others.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Where?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">In your web browser on any of your devices.</Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="When?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  Right after you awaken while your memories are fresh.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Why?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  That is up to you. Dreamingsheep&apos;s favorite activity is to practice{" "}
                  <span className="lucidicon-superhero"></span> flying.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="How?" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  <Link href={Routes.SignupPage()}>Sign up</Link> and have a good sleep. Sweet
                  dreams! <span className="lucidicon-zzz"></span>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="Who can read my dreams?"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Unlike other dream journaling websites that either have a forum or allow users to
                  interpret each other&apos;s public dreams (learn more in{" "}
                  <Link href={Routes.ArticlePageTheBrainstorming()}>The brainstorming</Link>), here,
                  no one has access to your dream garden. Just you.
                </Typography>
                <Box className="ratio ratio-16x9">
                  <iframe
                    width="560"
                    height="315"
                    src="https://www.youtube.com/embed/XEn-mmFiYDs"
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </Box>
                {/* NOTE: A/B video https://www.youtube-nocookie.com/embed/UwJvuo37dMw */}
                <Typography variant="body1" sx={{ mt: 2 }}>
                  Still don&apos;t believe us? Read more in{" "}
                  <Link href={Routes.ArticlePagePrivacyPolicyAndTermsOfServiceUpdate()}>
                    the Privacy Policy and Terms of Service update
                  </Link>
                  , or head straight to the{" "}
                  <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="Can someone see the symbols I created?"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1">No one.</Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="What about the stats about unicorns on the landing page. Aren't those public?"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1">
                  Those statistics are anonymous and pertain to the total number of dreams and the
                  most frequently used predefined/built-in symbols (excluding the ones created by
                  you). Your personal creations remain private.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="Where can i learn more about various use cases?"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1">
                  On the{" "}
                  <Link href={Routes.BlogPage()} passHref={true}>
                    Blog
                  </Link>
                  .
                </Typography>
              </CardContent>
            </Card>

            <p className="mt-4 text-right">
              <Link href="mailto:meh@dreamingsheep.net" passHref={true}>
                <Button variant="contained">Ask</Button>
              </Link>
            </p>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

FaqPage.authenticate = false
FaqPage.getLayout = (page) => (
  <Layout
    title="FAQ"
    description="Frequently asked questions about dreamingsheep — privacy, dream statistics, symbols, lucid dreams, and why the dream journal is free (forever)."
    ogCoverImage={ogCoverImageFaq.src}
  >
    {page}
  </Layout>
)

export default FaqPage
