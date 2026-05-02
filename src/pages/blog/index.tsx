import { gSSP } from "src/blitz-server"
import Link from "next/link"
import Image from "next/image"
import { InferGetServerSidePropsType } from "next"
import { useRouter } from "next/router"
import { BlitzPage } from "@blitzjs/next"
import Layout from "src/core/layouts/Layout"
import {
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Pagination,
  Paper,
} from "@mui/material"
import sheepRecall from "public/assets/sheep-recall.png"
import titleBlog from "public/assets/title-blog.png"
import ogCoverImageBlog from "public/assets/cover1200x630-blog.jpg"
import { getBlogs } from "src/pages/api/blog/get-blogs"
import { Fragment, Suspense } from "react"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import { ITEMS_PER_PAGE } from "src/core/constants/general"

const BlogPage: BlitzPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ blogs }) => {
  const router = useRouter()
  const page = Number(router.query.page) || 1

  function onPageChange(_, page: number) {
    router.push({ query: { page: page } })
  }

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
            <h1 className="heading">
              <Image src={titleBlog} alt="Blog" width={63} height={55} />
              <span className="sr-only">Blog</span>
            </h1>

            {blogs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((blog, index) => (
              <Card key={index} className="bg-mui-secondary-light mb-4">
                <CardHeader
                  title={<Link href={`blog/${blog.href}`}>{blog.title}</Link>}
                  className="pb-0"
                  component="h2"
                />
                <CardHeader subheader={blog.date} className="py-0" />

                <CardContent>
                  <Grid container>
                    <Grid item xs sm={3}>
                      {/* https://images.pexels.com/photos/5243591/pexels-photo-5243591.jpeg */}
                      <Link href={`blog/${blog.href}`}>
                        <div className="relative w-full h-full">
                          <Image
                            src={blog.imageUrl}
                            alt={blog.title}
                            width={184}
                            height={184}
                            className="object-cover cursor-pointer w-full h-auto aspect-square mb-2 sm:mb-0"
                            // fill
                          />
                        </div>
                      </Link>
                    </Grid>
                    <Grid item sm={9}>
                      <Typography variant="body1" sx={{ ml: { xs: 0, sm: 2 } }}>
                        {blog.content}
                        <Link href={`blog/${blog.href}`}>Read more</Link>
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}

            <Paper className="inline-block">
              <Pagination
                count={Math.ceil(blogs.length / ITEMS_PER_PAGE)}
                page={page}
                onChange={onPageChange}
                color="primary"
                shape="rounded"
              />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

BlogPage.authenticate = false
BlogPage.getLayout = (page) => (
  <Layout title="Blog" ogCoverImage={ogCoverImageBlog.src}>
    {page}
  </Layout>
)

export const getServerSideProps = gSSP(async ({ req, res }) => {
  const blogs = getBlogs()

  return {
    props: {
      blogs,
    },
  }
})

export default BlogPage
