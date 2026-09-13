import Link, { LinkProps } from "next/link"
import { Fragment, ReactNode } from "react"

export interface SheepLinkProps {
  /** where this page's sheep leads, or null when there is nowhere to go from here */
  href: LinkProps["href"] | null
  children: ReactNode
}

/**
 * The sheep at the top of a page doubles as the way back to where that section starts: today's
 * journal, the first page of symbols or of a search, the blog index, the landing page.
 *
 * It earns its keep because the header nav renders for logged-in users only (`Header.tsx` gates
 * the whole thing on `session.userId`), so a visitor reading an article or the FAQ can otherwise
 * only leave through the footer, at the bottom of a long page.
 *
 * `href` is null where there is nowhere to go — stats and settings are single pages, and page 1
 * or today already *is* the start — and the sheep then renders exactly as it always has: no
 * pointer cursor, no click that lands you where you already stand.
 */
export const SheepLink = ({ href, children }: SheepLinkProps) =>
  href ? <Link href={href}>{children}</Link> : <Fragment>{children}</Fragment>

export default SheepLink
