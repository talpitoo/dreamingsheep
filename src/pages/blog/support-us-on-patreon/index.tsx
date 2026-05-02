import Head from "next/head"
import Image from "next/image"
import Link from "next/link"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography } from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import blogPatreon from "public/assets/blog-patreon-new.jpg"
import titleBlog from "public/assets/title-blog.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { BlitzPage } from "@blitzjs/next"

const ArticlePageSupportUsOnPatreon: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Support us on Patreon | dreamingsheep</title>
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
              <CardHeader title="Support us on Patreon" className="pb-0" component="h1" />
              <CardHeader subheader="Sun Jul 9 2023" className="py-0" />
              <CardContent>
                <Image
                  src={blogPatreon}
                  alt="Patreon logo"
                  width={1080}
                  height={1080}
                  className="w-full h-auto"
                />
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {" "}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  During the initial discussions, friends suggested various subscription plans, but
                  the more i thought about it, the less i liked the idea. How could i ask for money
                  for a service where people log their dreams? It felt contrary to the spirit of
                  this ethereal endeavor. From that moment on, i knew that <em>dreamingsheep</em>{" "}
                  would remain forever free. Even if it helps just one person, my mission will be
                  fulfilled, and i will die in peace with a smile on my face.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  However, for practical reasons, the hosting costs should still be covered from my
                  own pocket money, and that&apos;s where you come in. This is an invitation to
                  support{" "}
                  <Link href="https://patreon.com/longtimenosleep">dreamingsheep on Patreon</Link>,
                  where you can contribute to keeping the dream alive.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  My secret plan is a “get-rich-quick” scheme where i could quit my job and focus
                  solely on enhancing <em>dreamingsheep</em>. Plus, i could attend Stephen
                  LaBerge&apos;s lucid dreaming workshops in Hawaii every year.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Another scenario is that <em>dreamingsheep</em> becomes lucid and grows into a
                  self-aware, self-sustaining AI in the ‘astral’ cloud. In that case, it could
                  automatically channel the funds towards the hosting company if i get possessed by
                  ‘mailer daemons’ in my dreams.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Now, let&apos;s address the elephant/ox in the room—I am aware of the tiers, perks
                  & co. in the Patreon ecosystem, but that&apos;s not our aim here. I have no desire
                  to artificially hold your attention, entertain you with videos or blog posts to
                  fulfill a ‘weekly quota’, or lure you into ‘subscribing to our channel’. It&apos;s
                  not about <em>dreamingsheep</em>; it&apos;s about <em>you</em>.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Your support is not required but if you find value in <em>dreamingsheep</em> and
                  wish to help, I offer an eternal thank you for your contribution, no matter the
                  size!
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
                  <em>
                    You may say that I&apos;m a dreamer
                    <br />
                    but I&apos;m not the only one
                    <br />
                    I hope someday you&apos;ll join us (on Patreon)
                    <br />
                    and the world will be as one.¹
                  </em>
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Continue to{" "}
                  <Link href="https://patreon.com/longtimenosleep">dreamingsheep on Patreon</Link>.
                </Typography>
                <hr />
                <Typography variant="body1">
                  <small>1 - quote from John Lennon, altered</small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

ArticlePageSupportUsOnPatreon.authenticate = false
ArticlePageSupportUsOnPatreon.getLayout = (page) => (
  <Layout ogCoverImage={ogCoverImageBlog.src}>{page}</Layout>
)

export default ArticlePageSupportUsOnPatreon
