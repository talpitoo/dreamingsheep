import { readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const blogDir = join(process.cwd(), "src/pages/blog")
const slugs = readdirSync(blogDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `/blog/${entry.name}`)
  .sort()

const urls = ["/faq", "/blog", ...slugs]
writeFileSync(join(process.cwd(), "public/sw-precache.json"), JSON.stringify(urls, null, 2))
console.log(`sw-precache.json: ${urls.length} URLs`)
