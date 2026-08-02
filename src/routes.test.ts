import { readdirSync, existsSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"
import { Routes } from "./routes"

describe("Routes manifest", () => {
  it("helpers return {pathname} and carry query params through", () => {
    expect(Routes.DreamsPage()).toEqual({ pathname: "/dreams" })
    expect(Routes.DreamsPage({ date: "2026-08-02" })).toEqual({
      pathname: "/dreams",
      query: { date: "2026-08-02" },
    })
    expect(Routes.Home().pathname).toBe("/")
  })

  it("every helper pathname maps to an existing page file", () => {
    const pagesDir = join(__dirname, "pages")
    for (const helper of Object.values(Routes)) {
      const { pathname } = helper()
      const rel = pathname === "/" ? "index" : pathname.slice(1)
      const candidates = [join(pagesDir, `${rel}.tsx`), join(pagesDir, rel, "index.tsx")]
      expect(
        candidates.some((c) => existsSync(c)),
        `no page file for ${pathname}`
      ).toBe(true)
    }
  })

  it("every page is reachable via some helper (no orphan pages)", () => {
    const covered = new Set(Object.values(Routes).map((h) => h().pathname))
    const walk = (dir: string, prefix: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.isDirectory() && e.name !== "api")
          return walk(join(dir, e.name), `${prefix}/${e.name}`)
        if (!e.name.endsWith(".tsx")) return []
        if (e.name.startsWith("_") || e.name === "404.tsx") return []
        const base =
          e.name === "index.tsx" ? prefix || "/" : `${prefix}/${e.name.replace(/\.tsx$/, "")}`
        return [base === "" ? "/" : base]
      })
    for (const pathname of walk(join(__dirname, "pages"), "")) {
      expect(covered.has(pathname), `no Routes helper for ${pathname}`).toBe(true)
    }
  })
})
