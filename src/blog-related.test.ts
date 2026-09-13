import { describe, expect, it } from "vitest"
import { getBlogs, getRelatedBlogs } from "src/pages/api/blog/get-blogs"

// Not colocated next to get-blogs.ts on purpose: anything ending in .ts under src/pages/ is a
// route to Next, and a *.test.ts there fails the build as a malformed API handler. This sits
// beside src/routes.test.ts instead — the other test that checks repo content against the
// filesystem.
//
// The "More from the blog" links are plain slug strings typed by hand into the articles'
// data.md — nothing in the type system stops a typo or a renamed folder, and the symptom
// (a card quietly disappearing) is easy to miss. These tests are that safety net.
describe("getRelatedBlogs", () => {
  const blogs = getBlogs()
  const slugs = blogs.map((blog) => blog.href)

  it("resolves every hand-picked slug in every data.md", () => {
    const dangling = blogs.flatMap((blog) =>
      blog.related.filter((href) => !slugs.includes(href)).map((href) => `${blog.href} -> ${href}`)
    )

    expect(dangling).toEqual([])
  })

  it("gives every article two related posts, itself never among them", () => {
    for (const slug of slugs) {
      const related = getRelatedBlogs(slug)

      expect(related).toHaveLength(2)
      expect(related.map((blog) => blog.href)).not.toContain(slug)
    }
  })

  it("honours the data.md order before falling back to the newest posts", () => {
    for (const slug of slugs) {
      const picked = getRelatedBlogs(slug).map((blog) => blog.href)
      const handPicked = blogs.find((blog) => blog.href === slug)!.related

      expect(picked.slice(0, handPicked.length)).toEqual(handPicked)
    }
  })

  it("falls back to the newest posts where there is no article to relate to", () => {
    // this is the landing page's section. `slugs` is only newest-first if the dates parse, and
    // they all carry a trailing period ("Sun Aug 16 2026.") — so assert that separately rather
    // than compare the fallback against a list that could be sorted by accident
    const dates = blogs.map((blog) => new Date(blog.date).getTime())

    expect(dates.some(Number.isNaN)).toBe(false)
    expect([...dates].sort((a, b) => b - a)).toEqual(dates)
    expect(getRelatedBlogs().map((blog) => blog.href)).toEqual(slugs.slice(0, 2))
  })

  it("ignores an unknown slug rather than throwing", () => {
    expect(getRelatedBlogs("no-such-article").map((blog) => blog.href)).toEqual(slugs.slice(0, 2))
  })

  it("leaves every article reachable from at least one other", () => {
    const linked = new Set(blogs.flatMap((blog) => blog.related))

    expect(slugs.filter((slug) => !linked.has(slug))).toEqual([])
  })
})
