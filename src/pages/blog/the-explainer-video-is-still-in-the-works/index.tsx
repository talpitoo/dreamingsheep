import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Box, Card, CardContent, CardHeader, Container, Grid, Typography } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import titleBlog from "public/assets/title-blog.png"
import blogFayeWongDreams from "public/assets/FayeWong-Dreams-TheCranberriesCover.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { AppPage as BlitzPage } from "src/core/types"
import Image from "next/image"
import Link from "next/link"

const ArticlePageTheExplainerVideoIsStillInTheWorks: BlitzPage = () => {
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
                title="The explainer video is still in the works"
                className="pb-0"
                component="h1"
              />
              <CardHeader subheader="Sun Aug 16 2026" className="py-0" />
              <CardContent>
                {/* the very snippet that sat commented out on the landing page for years */}
                <Box className="ratio ratio-16x9">
                  <iframe
                    width="560"
                    height="315"
                    src="https://www.youtube-nocookie.com/embed/0HE04S0hykE?si=tSgG3rIuNmFGnsW0&amp;controls=0"
                    title="YouTube video player: Faye Wong - Dreams - The Cranberries Cover"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  ></iframe>
                </Box>
                <Typography variant="body1" sx={{ mb: 2, mt: 2 }}>
                  For years there was a footnote on the landing page saying{" "}
                  <em>obviously, the explainer video is in the works</em>, and for just as many
                  years an <code>&lt;iframe&gt;</code> sat right underneath it, commented out,
                  patiently waiting for a video that never got made. The landing page has just been
                  redesigned. The footnote is gone. But what was actually inside that comment
                  deserves better than a <code>{"{/* */}"}</code>, so here it is, moved to a place
                  where it can finally play.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  It was never an explainer video. It was Faye Wong singing <em>Dreams</em>&#32;—
                  the Cranberries song¹, in Cantonese, the one she carries through Chungking
                  Express². Nothing about it explains what this website does, and everything about
                  it explains why this website exists.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  As for the explainer video: still in the works, in the way that things are in the
                  works. Until then the <Link href="/#demo">#demo</Link> on the landing page does
                  the explaining, and Faye does the rest.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Long time no sleep!
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>1 - Dreams - The Cranberries</small>
                  <br />
                  <small>2 - Chungking Express - Wong Kar-wai</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageTheExplainerVideoIsStillInTheWorks.authenticate = false
ArticlePageTheExplainerVideoIsStillInTheWorks.getLayout = (page) => (
  <Layout
    title="The explainer video is still in the works"
    description="The landing page promised an explainer video for years. What actually sat in that commented-out iframe was Faye Wong singing Dreams — a cover of a cover of a cover."
    ogCoverImage={blogFayeWongDreams.src}
    ogCoverImageSecondary={ogCoverImageBlog.src}
  >
    {page}
  </Layout>
)

export default ArticlePageTheExplainerVideoIsStillInTheWorks
