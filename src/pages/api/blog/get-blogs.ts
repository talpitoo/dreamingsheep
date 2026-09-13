import { NextApiHandler } from "next"
import fs from "fs"
import path from "path"
import matter from "gray-matter"

export interface Blog {
  href: string
  title: string
  date: string
  content: string
  imageUrl: string
  /** hand-picked slugs for "More from the blog" — see getRelatedBlogs */
  related: string[]
}

export const getBlogs = () => {
  const blogs: Blog[] = []

  const blogPath = "src/pages/blog"

  const blogDirs = fs
    .readdirSync(blogPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  blogDirs.map((dir) => {
    const filename = fs
      .readdirSync(path.join(blogPath, dir))
      .find((file) => path.extname(file) === ".md")

    if (filename) {
      const file = fs.readFileSync(path.join(blogPath, dir, filename), "utf8")

      const { content, data } = matter(file)

      const blog: Blog = {
        href: dir || "",
        title: data?.title,
        date: data?.date,
        imageUrl: data?.imageUrl || "",
        content: content || "",
        related: Array.isArray(data?.related) ? data.related : [],
      }
      blogs.push(blog)
    }
  })

  // NOTE: little help from ChatGPT :)
  blogs.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return 0
  })

  return blogs
}

/**
 * The articles to show in a "More from the blog" section.
 *
 * Hand-picked links live in the `related:` list of each article's `data.md` — that list is the
 * whole editing interface: add a slug to link, remove it to unlink, reorder to re-rank. Unknown
 * slugs and self-references are skipped, so a renamed or deleted article can never 404 from here.
 * Whatever the list leaves open is filled with the most recent *other* articles, so a brand-new
 * post shows something sensible before anyone has linked it anywhere.
 *
 * `slug` is the article we are standing on, and is left empty on pages that are not an article
 * (the landing page) — those simply fall through to "the most recent posts".
 */
export const getRelatedBlogs = (slug = "", count = 2): Blog[] => {
  const blogs = getBlogs()
  const bySlug = new Map(blogs.map((blog) => [blog.href, blog]))

  const related: Blog[] = []
  const take = (blog?: Blog) => {
    if (blog && blog.href !== slug && !related.includes(blog) && related.length < count) {
      related.push(blog)
    }
  }

  bySlug.get(slug)?.related.forEach((href) => take(bySlug.get(href)))
  blogs.forEach(take) // already sorted newest-first, so the filler is the freshest news

  return related
}

const handler: NextApiHandler = async (_, res) => {
  const blogs = getBlogs()
  res.send(blogs)
}

export default handler
