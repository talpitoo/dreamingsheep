import { api } from "src/blitz-server"
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

const handler: NextApiHandler = async (_, res) => {
  const blogs = getBlogs()
  res.send(blogs)
}

export default api(handler)
