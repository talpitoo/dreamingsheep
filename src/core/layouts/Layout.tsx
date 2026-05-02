import Head from "next/head"
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
  ogCoverImage?: string
  children: ReactNode
  childrenContainerClassName?: string
}

// const domain = 'https://dreamingsheep.net/' // TODO incorporate domain

const Layout = ({ title, ogCoverImage, children, childrenContainerClassName }: LayoutProps) => {
  // const ogImage = ogCoverImage ? `${domain}${ogCoverImage}` : `${domain}${ogCoverImageDefault.src}` // TODO incorporate domain
  const ogImage = ogCoverImage ? ogCoverImage : ogCoverImageDefault.src

  return (
    <Fragment>
      <Head>
        <title>{`${title ? title + " | dreamingsheep" : "dreamingsheep"}`}</title>
        <meta
          name="description"
          content="dreamingsheep, an online journal for your dreams and beyond"
        />
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
