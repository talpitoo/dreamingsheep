import type { SyntheticEvent } from "react"

// the same file the service worker precaches and serves for uncached blog covers (public/sw.js)
export const OFFLINE_BLOG_COVER = "/assets/blog-offline.png"

// a cover that fails to load — a cross-origin cover offline, which the same-origin-only worker
// cannot stand in for, or simply a missing file — shows the generic blog cover instead of a
// broken image. The marker stops a second swap if the stand-in itself fails.
export function fallbackToOfflineCover(event: SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget
  if (img.dataset.fallback) return
  img.dataset.fallback = "cover"
  img.srcset = ""
  img.src = OFFLINE_BLOG_COVER
}
