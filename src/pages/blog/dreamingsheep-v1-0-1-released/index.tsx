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
import blogDna from "public/assets/blog-dna.gif"
import Link from "next/link"

const ArticlePageDreamingsheepV101Released: BlitzPage = () => {
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
              <CardHeader title="dreamingsheep v1.0.1 released" className="pb-0" component="h1" />
              <CardHeader subheader="Mon Nov 6 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogDna}
                  alt="Animation of a rotating DNA structure"
                  width={181}
                  height={313}
                  className="w-full h-auto object-cover aspect-square"
                />
                {/* NOTE: custom image classes */}
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep,
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  starting today, the DNS¹ (<em>Deoxyribonucleic</em> System) of our development
                  server points to the live IP address, which in translation means that{" "}
                  <em>dreamingsheep</em>&apos;s DNA¹ has officially come to life!
                </Typography>
                <code className="block mb-4">
                  git checkout master
                  <br />
                  git tag -a v1.0.1 -m &quot;Release version 1.0.1&quot;
                  <br />
                  git push origin v1.0.1
                </code>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  In case you were under the false impression that we were running some kind of
                  woo-woo website, the above commands should make it clear that we are doing serious
                  business here! If you are still a bit suspicious, you can perform a forensic DNA
                  test (DNS lookup²) on the sweat and blood that went into our creation.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  If you haven&apos;t done so already, for context, please read the{" "}
                  <Link href={Routes.ArticlePageLifePurposeMilestoneOne()}>
                    Life purpose, milestone #1
                  </Link>
                  , then <Link href="/">sign up</Link> and follow your dreams!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Happy dream logging!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - fun fact: in Hungarian,{" "}
                    <Link href="https://hu.wikipedia.org/wiki/Domain_Name_System" passHref={true}>
                      DNS
                    </Link>{" "}
                    and{" "}
                    <Link href="https://hu.wikipedia.org/wiki/Dezoxiribonukleinsav" passHref={true}>
                      DNA
                    </Link>{" "}
                    use the same abbreviation
                  </small>
                  <br />
                  <small>
                    2 - DNS lookup is like a phone book for the internet, translating user-friendly
                    domain names (like www.example.com) into the numerical IP addresses that
                    computers use to find the website.
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

ArticlePageDreamingsheepV101Released.authenticate = false
ArticlePageDreamingsheepV101Released.getLayout = (page) => (
  <Layout
    title="dreamingsheep v1.0.1 released"
    description="dreamingsheep v1.0.1 is live: the dream journal's DNS — ahem, DNA — has officially come to life on the production server."
    ogCoverImage={blogDna.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageDreamingsheepV101Released
