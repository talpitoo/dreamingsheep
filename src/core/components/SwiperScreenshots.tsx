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

export const SwiperScreenshots = () => {
  const [firstSwiper, setFirstSwiper] = useState<any>(null)
  const [secondSwiper, setSecondSwiper] = useState<any>(null)
  // NOTE https://github.com/nolimits4web/swiper/issues/5500, useState(null); useState<Swiper | null>(null);

  return (
    <Box
      className="xsmax:scale-75 xsmax:-mx-8 smmax:-mx-2 relative w-[320px] h-[240px] lg:w-[800px] lg:h-[600px] mx-auto mb-8 lg:mb-4"
      id="demo"
    >
      <Box className="w-[320px] h-[240px] lg:w-[800px] lg:h-[600px]">
        <Image src={nexus10} alt="nexus 10" width={800} height={600} className="w-full h-full" />
      </Box>
      <Box className="absolute top-[36px] left-[46px] lg:top-[87px] lg:left-[114px] w-[242px] h-[151px] lg:w-[607px] lg:h-[379px] overflow-hidden">
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
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotDreamsTablet02}
              alt="dreams screenshot #2"
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSymbolsTablet}
              alt="symbols screenshot"
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotStatsTablet}
              alt="stats screenshot"
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSearchTablet}
              alt="search screenshot"
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSettingsTablet01}
              alt="settings screenshot"
              width={607}
              height={379}
              className="w-full h-full"
            />
          </SwiperSlide>
        </Swiper>
      </Box>
      <Box className="absolute top-0 w-[320px] h-[240px] lg:w-[800px] lg:h-[600px] pointer-events-none z-10">
        <Image src={nexus5} alt="nexus 5" width={800} height={600} className="w-full h-full" />
      </Box>
      <Box className="absolute top-[87px] left-[12px] lg:top-[216px] lg:left-[27px] w-[69px] h-[125px] lg:w-[178px] lg:h-[316px] overflow-hidden z-10">
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
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotDreamsMobile02}
              alt="dreams screenshot #2"
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSymbolsMobile}
              alt="symbols screenshot"
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotStatsMobile}
              alt="stats screenshot"
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSearchMobile}
              alt="search screenshot"
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
          <SwiperSlide>
            <Image
              src={screenshotSettingsMobile01}
              alt="settings screenshot"
              width={178}
              height={316}
              className="w-full h-full"
            />
          </SwiperSlide>
        </Swiper>
      </Box>
      <Box className="absolute bottom-0 right-0 z-10 mr-5 -mb-3 lg:m-5">
        {/* <Button variant="outlined" className="swiper-button-prev-custom mr-4">
          prev
        </Button> */}
        <Button
          variant="contained"
          className="swiper-button-next-custom"
          endIcon={<SwapHorizIcon className="opacity-80" />}
        >
          demo
        </Button>
        <Typography variant="body1" className="absolute top-0 right-0 -m-2">
          ⁶
        </Typography>
      </Box>
    </Box>
  )
}

export default SwiperScreenshots
