import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// what the service worker precaches at install (and refreshes on /blog visits): the public
// shells, plus the names of every blog cover so an uncached cover offline gets the generic blog
// cover and not the offline sheep — covers are called anything (blog-*, sheep-matrix, a pexels
// photo…), so the worker cannot guess from the file name or the page
const blogDir = join(process.cwd(), "src/pages/blog")
const posts = readdirSync(blogDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const pages = ["/faq", "/blog", ...posts.map((slug) => `/blog/${slug}`)]

// a cover's name without path, query and extension: the same key the worker derives from a
// request URL, whether it is /assets/blog-dna.gif, a content-hashed static import
// (blog-dna.<hash>.gif) or a cross-origin photo
const covers = [
  ...new Set(
    posts
      .map(
        (slug) =>
          readFileSync(join(blogDir, slug, "data.md"), "utf8").match(/^imageUrl:\s*"([^"]+)"/m)?.[1]
      )
      .filter(Boolean)
      .map((url) => url.split("?")[0].split("/").pop().split(".")[0])
  ),
].sort()

writeFileSync(
  join(process.cwd(), "public/sw-precache.json"),
  JSON.stringify({ pages, covers }, null, 2)
)
console.log(`sw-precache.json: ${pages.length} pages, ${covers.length} cover names`)
