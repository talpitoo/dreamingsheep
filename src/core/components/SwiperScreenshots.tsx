import Image from "next/image"
import { Box, Button, IconButton, Typography } from "@mui/material"
import nexus5 from "public/assets/nexus5.png"
import nexus10 from "public/assets/nexus10.png"
import screenshotDreamsTablet01 from "public/assets/screenshot-dreams-tablet-01.png"
import screenshotDreamsTablet02 from "public/assets/screenshot-dreams-tablet-02.png"
import screenshotSymbolsTablet from "public/assets/screenshot-symbols-tablet.png"
import screenshotStatsTablet from "public/assets/screenshot-stats-tablet.png"
import screenshotSearchTablet from "public/assets/screenshot-search-tablet.png"
import screenshotSettingsTablet01 from "public/assets/screenshot-settings-tablet-01.png"
import screenshotDreamsMobile01 from "public/assets/screenshot-dreams-mobile-01.png"
import screenshotDreamsMobile02 from "public/assets/screenshot-dreams-mobile-02.png"
import screenshotSymbolsMobile from "public/assets/screenshot-symbols-mobile.png"
import screenshotStatsMobile from "public/assets/screenshot-stats-mobile.png"
import screenshotSearchMobile from "public/assets/screenshot-search-mobile.png"
import screenshotSettingsMobile01 from "public/assets/screenshot-settings-mobile-01.png"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import React, { useState } from "react"
import { Navigation, Controller } from "swiper"
import { Swiper, SwiperSlide } from "swiper/react"
// "swiper/css" is imported from src/styles/index.css so it lands in a cascade layer (issue #1)
// import "swiper/css/navigation"

// Rendered by the landing page inside the login card (AuthenticationContainer's
// footerComponent slot). A plain anchor: the browser handles the #demo jump itself
// (html { scroll-behavior: smooth } animates it), so it works before hydration and
// with JS disabled — no coupling to the swiper. The ² is the literal U+00B2 glyph,
// superscript by its own shape, so the button's uppercase/font styles can't flatten
// it; it anchors footnote 2 (the Nexus note) to the label.
export const SwiperDemoButton = () => (
  <Button
    variant="outlined"
    fullWidth
    href="#demo"
    onClick={(event) => {
      // Without JS, or before hydration, the href does the work: the anchor jumps and the URL
      // keeps its #demo, which is the correct fallback. With JS we scroll to the collage
      // ourselves and never let the hash be written, so a URL copied from the address bar after
      // pressing demo is the plain landing page rather than one that scrolls a stranger straight
      // past the sign-up form.
      //
      // Scrolling instead of letting the anchor jump and then calling
      // `history.replaceState` is what makes this work in every browser: Firefox commits the
      // fragment AFTER a setTimeout(0) callback runs, so stripping the hash on a timer put it
      // straight back (Chrome's ordering happened to be the other way round). Nothing to strip
      // now, so nothing to race.
      //
      // Modified clicks are left to the browser — ctrl/cmd-click still opens #demo in a new tab.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const demo = document.getElementById("demo")
      if (!demo) return

      event.preventDefault()
      // no `behavior` option on purpose: that honours `html { scroll-behavior: smooth }` from
      // index.css, and any reduced-motion guard the CSS may grow, instead of forcing smooth
      demo.scrollIntoView()
    }}
  >
    demo²
  </Button>
)

export const SwiperScreenshots = () => {
  const [firstSwiper, setFirstSwiper] = useState<any>(null)
  const [secondSwiper, setSecondSwiper] = useState<any>(null)
  // NOTE https://github.com/nolimits4web/swiper/issues/5500, useState(null); useState<Swiper | null>(null);

  return (
    // lg breaks out of the 1152px Container content box (-mx-6 on both sides) so the
    // 1.5x-enlarged devices get their full 1200px
    <Box
      className="xsmax:scale-75 sm:mt-8 md:mt-0 relative w-[320px] h-[240px] md:w-[800px] md:h-[600px] lg:w-[1200px] lg:h-[900px] mx-auto lg:-mx-6 mb-8 md:mb-4"
      id="demo"
    >
      <Box className="w-[320px] h-[240px] md:w-[800px] md:h-[600px] lg:w-[1200px] lg:h-[900px]">
        <Image src={nexus10} alt="nexus 10" width={1200} height={900} className="w-full h-full" />
      </Box>
      <Box className="absolute top-[36px] left-[46px] md:top-[87px] md:left-[114px] lg:top-[130.5px] lg:left-[171px] w-[242px] h-[151px] md:w-[607px] md:h-[379px] lg:w-[910.5px] lg:h-[568.5px] overflow-hidden">
        <Swiper
          modules={[Navigation, Controller]}
          navigation={{
            prevEl: ".swiper-button-prev-custom",
            nextEl: ".swiper-button-next-custom",
          }}
          onSwiper={setFirstSwiper}
          controller={{ control: secondSwiper }}
          loop={true}
          // onSlideChange={() => console.log("slide change")}
          // onSwiper={(swiper) => console.log(swiper)}
        >
          <SwiperSlide>
            <Image
              src={screenshotDreamsTablet01}
              alt="dreams screenshot"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotDreamsTablet02}
              alt="dreams screenshot #2"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSymbolsTablet}
              alt="symbols screenshot"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotStatsTablet}
              alt="stats screenshot"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSearchTablet}
              alt="search screenshot"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSettingsTablet01}
              alt="settings screenshot"
              width={911}
              height={569}
              className="w-full h-full"
            />
          </SwiperSlide>
        </Swiper>
      </Box>
      <Box className="absolute top-0 w-[320px] h-[240px] md:w-[800px] md:h-[600px] lg:w-[1200px] lg:h-[900px] pointer-events-none z-10">
        <Image src={nexus5} alt="nexus 5" width={1200} height={900} className="w-full h-full" />
      </Box>
      <Box className="absolute top-[87px] left-[12px] md:top-[216px] md:left-[27px] lg:top-[324px] lg:left-[40.5px] w-[69px] h-[125px] md:w-[178px] md:h-[316px] lg:w-[267px] lg:h-[474px] overflow-hidden z-10">
        <Swiper
          onSwiper={setSecondSwiper}
          controller={{ control: firstSwiper }}
          modules={[Navigation, Controller]}
          // navigation={{
          //   prevEl: ".swiper-button-prev-custom-mobile",
          //   nextEl: ".swiper-button-next-custom-mobile",
          // }}
          loop={true}
          // direction="vertical"
          // cssMode={true}
          // onSlideChange={() => console.log("slide change")}
          // onSwiper={(swiper) => console.log(swiper)}
        >
          <SwiperSlide>
            <Image
              src={screenshotDreamsMobile01}
              alt="dreams screenshot"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotDreamsMobile02}
              alt="dreams screenshot #2"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSymbolsMobile}
              alt="symbols screenshot"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotStatsMobile}
              alt="stats screenshot"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSearchMobile}
              alt="search screenshot"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSettingsMobile01}
              alt="settings screenshot"
              width={267}
              height={474}
              className="w-full h-full"
            />
          </SwiperSlide>
        </Swiper>
      </Box>
      {/* prev/next drive the tablet swiper (Navigation binds the two selector classes
          configured above); the phone follows via the Controller link */}
      <IconButton
        aria-label="previous screenshot"
        color="primary"
        className="swiper-button-prev-custom absolute -left-12 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white shadow-md"
      >
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        aria-label="next screenshot"
        color="primary"
        className="swiper-button-next-custom absolute -right-12 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white shadow-md"
      >
        <ChevronRightIcon />
      </IconButton>
      {/* footnote 2's marker stays with the devices it describes (the demo button in the
          login card carries the other one) */}
      <Box className="absolute bottom-0 right-0 z-10 mr-5 -mb-3 md:m-5">
        <Typography variant="body1">²</Typography>
      </Box>
    </Box>
  )
}

export default SwiperScreenshots
