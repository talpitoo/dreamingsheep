import Image from "next/image"
import { Box, Button, Typography } from "@mui/material"
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
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import React, { useState } from "react"
import { Navigation, Controller } from "swiper"
import { Swiper, SwiperSlide } from "swiper/react"
import "swiper/css"
// import "swiper/css/navigation"

// The demo/next button is rendered OUTSIDE this component (the landing page slots it
// into the login card, see src/pages/index.tsx). Swiper resolves `navigation.nextEl`
// from the selector string below with a document-wide query, so the button drives the
// swiper from anywhere in the DOM — keep the class and the selector in sync.
export const SWIPER_NEXT_CLASS = "swiper-button-next-custom"

export const SwiperDemoButton = () => (
  <Button
    variant="outlined"
    fullWidth
    className={SWIPER_NEXT_CLASS}
    endIcon={<SwapHorizIcon className="opacity-80" />}
  >
    demo
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
      className="xsmax:scale-75 xsmax:-mx-8 smmax:-mx-2 sm:mt-8 md:mt-0 relative w-[320px] h-[240px] md:w-[800px] md:h-[600px] lg:w-[1200px] lg:h-[900px] mx-auto lg:-mx-6 mb-8 md:mb-4"
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
      {/* the button that used to live here moved into the login card (SwiperDemoButton);
          footnote 6 stays with the devices it refers to */}
      <Box className="absolute bottom-0 right-0 z-10 mr-5 -mb-3 md:m-5">
        <Typography variant="body1">²</Typography>
      </Box>
    </Box>
  )
}

export default SwiperScreenshots
