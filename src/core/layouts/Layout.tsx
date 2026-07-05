import Head from "next/head"
import { useRouter } from "next/router"
import Footer from "src/core/layouts/Footer"
import Header from "src/core/layouts/Header"
import React, { Fragment, ReactNode, Suspense } from "react"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import ogCoverImageDefault from "public/assets/cover1200x630.jpg"
// import faviconSvg from "public/assets/icon.svg"
// import faviconPng196 from "public/assets/cover196x196.png"
// import faviconPng160 from "public/assets/cover160x160.png"
// import faviconPng96 from "public/assets/cover96x96.png"
// import faviconPng32 from "public/assets/cover32x32.png"
import faviconApple from "public/assets/apple-icon.png"

type LayoutProps = {
  title?: string
  description?: string
  ogCoverImage?: string
  ogCoverImageSecondary?: string
  children: ReactNode
  childrenContainerClassName?: string
}

const DOMAIN = "https://dreamingsheep.net"
const DESCRIPTION = "dreamingsheep, an online journal for your dreams and beyond"

// social scrapers (Facebook, LinkedIn, WhatsApp, ...) silently drop relative og:image URLs
const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${DOMAIN}${path}`)

const Layout = ({
  title,
  description,
  ogCoverImage,
  ogCoverImageSecondary,
  children,
  childrenContainerClassName,
}: LayoutProps) => {
  const router = useRouter()
  const ogImage = absoluteUrl(ogCoverImage ? ogCoverImage : ogCoverImageDefault.src)
  const pageTitle = title ? `${title} | dreamingsheep` : "dreamingsheep"
  const pageDescription = description || DESCRIPTION
  // bare domain + query-less path: one canonical per page, no ?utm_/?page= duplicates,
  // and it reasserts the non-www preference on every page
  const canonicalUrl = `${DOMAIN}${(router.asPath ?? "/").split("?")[0]?.split("#")[0]}`

  return (
    <Fragment>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content="dreamingsheep" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href={faviconApple.src} type="image/png" />
        {/* <link rel="icon" href={faviconSvg.src} type="image/svg+xml" />
        <link rel="icon" sizes="196x196" href={faviconPng196.src} type="image/png" />
        <link rel="icon" sizes="160x160" href={faviconPng160.src} type="image/png" />
        <link rel="icon" sizes="96x96" href={faviconPng96.src} type="image/png" />
        <link rel="icon" sizes="32x32" href={faviconPng32.src} type="image/png" /> */}
        <link rel="apple-touch-icon" href={faviconApple.src} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />

        <meta property="og:image" content={ogImage} />
        <meta property="twitter:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {ogCoverImageSecondary && (
          <>
            <meta property="og:image" content={absoluteUrl(ogCoverImageSecondary)} />
            <meta property="twitter:image" content={absoluteUrl(ogCoverImageSecondary)} />
          </>
        )}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link rel="stylesheet" href="/styles/noscript.css" />
        </noscript>
      </Head>

      <div className="min-h-screen overflow-x-hidden flex flex-col items-center justify-center w-full">
        <noscript>
          <p id="no-script-content">Please enable JavaScript or write your dreams on a paper 😊.</p>
        </noscript>
        <Suspense fallback={<></>}>
          <Header />
        </Suspense>
        <div
          className={`min-h-screen-minus-header overflow-x-hidden flex flex-col items-center justify-between w-full ${
            childrenContainerClassName || "py-6"
          }`}
        >
          <Suspense fallback={<LoadingSpiral />}>{children}</Suspense>
          <Footer />
        </div>
      </div>
    </Fragment>
  )
}

export default Layout
