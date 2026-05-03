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
import sheepPrivacy from "public/assets/sheep-privacy.png"
import Link from "next/link"

const ArticlePagePrivacyPolicyAndTermsOfServiceUpdate: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Privacy Policy and Terms of Service update | dreamingsheep</title>
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
              <CardHeader
                title="Privacy Policy and Terms of Service update"
                className="pb-0"
                component="h1"
              />
              <CardHeader subheader="Sat Feb 14 2026" className="py-0" />
              <CardContent>
                <Image
                  src={sheepPrivacy}
                  alt="privacy sheep"
                  width={384}
                  height={384}
                  className="w-full h-auto object-cover aspect-square"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  We&apos;ve updated our{" "}
                  <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link> and added{" "}
                  <Link href={Routes.TermsOfServicePage()}>Terms of Service</Link> to be more
                  transparent about how <em>dreamingsheep</em> handles your data.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Nothing has changed</strong> about what we collect or how we use it — we
                  &apos;ve just documented it properly. Think of it as finally writing down the
                  dream you&apos;ve been meaning to log for months.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Here&apos;s the TL;DR:
                </Typography>
                <Typography variant="body1" component="div">
                  <ul>
                    <li>
                      We collect your <strong>email</strong> (for login) and your{" "}
                      <strong>dream entries</strong> (because that&apos;s literally what the app
                      does)
                    </li>
                    <li>We don&apos;t sell, share, or secretly analyze your dreams</li>
                    <li>You can export or delete everything anytime from Settings</li>
                    <li>
                      Google Analytics is anonymous — we just want to know if anyone actually clicks
                      on things
                    </li>
                  </ul>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  If you signed up at any point in the past, you already agreed to let us guard your
                  dreams. Now it&apos;s just in writing. No new soul-stealing clause was added —
                  that was always the case <span className="lucidicon lucidicon-scream"></span>{" "}
                  bwahaha!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Read the full <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link> and{" "}
                  <Link href={Routes.TermsOfServicePage()}>Terms of Service</Link>, and as always —
                  sweet dreams!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Meh!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePagePrivacyPolicyAndTermsOfServiceUpdate.authenticate = false
ArticlePagePrivacyPolicyAndTermsOfServiceUpdate.getLayout = (page) => (
  <Layout ogCoverImage={sheepPrivacy.src} ogCoverImageSecondary={ogCoverImageBlog.src}>
    {page}
  </Layout>
)

export default ArticlePagePrivacyPolicyAndTermsOfServiceUpdate
