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
import blogMaintenance from "public/assets/blog-sheep-bliss-by-lucifer-enterprises.jpg"
import Link from "next/link"

const ArticlePageAGlitchInTheDreamJournalMatrix: BlitzPage = () => {
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
              <CardHeader
                title="A glitch in the dream journal matrix"
                className="pb-0"
                component="h1"
              />
              <CardHeader subheader="Mon Nov 21 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogMaintenance}
                  alt="maintenance page source code"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
                <Typography variant="body1" align="right">
                  ¹
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  We&apos;ve had to bump the version to <code>v2.0.0</code> as a major bug was
                  discovered on the database level. Hopefully, you might have noticed nothing more
                  than a glitch on the settings page and slight inconsistencies with the symbols.
                  All systems are now back online.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  In case you were about to fall asleep while waiting for the maintenance window to
                  end, you could count the good ol&apos;{" "}
                  <Link href="https://adrianotiger.github.io/desktopPet/">
                    Windows desktop sheep
                  </Link>
                  , recreated by <Link href="https://github.com/Adrianotiger">@Adrianotiger</Link>{" "}
                  for 64-bit.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Meh!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>
                    1 - cover photo &copy;{" "}
                    <Link href="https://www.deviantart.com/lucifer-enterprises/art/Sheep-Bliss-20265607">
                      Eric Yuen
                    </Link>{" "}
                    - Sheep Bliss
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

ArticlePageAGlitchInTheDreamJournalMatrix.authenticate = false
ArticlePageAGlitchInTheDreamJournalMatrix.getLayout = (page) => (
  <Layout
    title="A glitch in the dream journal matrix"
    description="A database-level bug bumped dreamingsheep to v2.0.0 — what glitched in the dream journal matrix, and how your dreams slept through it."
    ogCoverImage={blogMaintenance.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageAGlitchInTheDreamJournalMatrix
