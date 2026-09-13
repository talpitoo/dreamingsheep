import { Fragment } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardHeader, Grid, Typography } from "@mui/material"
import type { Blog } from "src/pages/api/blog/get-blogs"

export interface RelatedPostsProps {
  blogs: Blog[]
}

/**
 * "More from the blog" — the blog index's card with the excerpt taken out, so only the title,
 * the date and the image are left. Two per row from sm (600px) up, stacked below it.
 *
 * Which posts land here is decided server-side by `getRelatedBlogs`, from the `related:` list in
 * each article's `data.md`; this component only paints them and is safe to import anywhere (the
 * `Blog` import is type-only, so the `fs` reads behind it never reach the client bundle).
 */
export const RelatedPosts = ({ blogs }: RelatedPostsProps) => {
  if (blogs.length === 0) return null

  return (
    <Fragment>
      {/* same rhythm as the stats page's section heading: a generous gap above (which collapses
          with the article card's own mb-4, so both hosts get the same 32px), a tight one below.
          White, because this sits directly on the dark canvas background, not inside a card */}
      <Typography variant="h4" component="h2" className="text-white mt-8 mb-2">
        More from the blog
      </Typography>
      <Grid container spacing={3}>
        {blogs.map((blog) => (
          <Grid item xs={12} sm={6} key={blog.href}>
            {/* h-full so a one-line and a two-line title still produce two cards of equal height */}
            <Card className="bg-mui-secondary-light h-full">
              <CardHeader
                title={<Link href={`/blog/${blog.href}`}>{blog.title}</Link>}
                className="pb-0"
                component="h3"
              />
              <CardHeader subheader={blog.date} className="py-0" />
              <CardContent>
                <Link href={`/blog/${blog.href}`}>
                  <Image
                    src={blog.imageUrl}
                    alt={blog.title}
                    width={184}
                    height={184}
                    className="object-cover cursor-pointer w-full h-auto aspect-square"
                  />
                </Link>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Fragment>
  )
}

export default RelatedPosts
