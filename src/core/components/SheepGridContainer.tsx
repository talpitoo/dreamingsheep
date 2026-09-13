import Image from "next/image"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { Box, Grid } from "@mui/material"
import { ReactNode } from "react"
import SheepLink, { SheepLinkProps } from "./SheepLink"

interface SheepGridContainerProps {
  imageComponent: ReactNode
  // kept in step with AuthenticationContainer's prop of the same name: this is its loading
  // placeholder, so the sheep must lead to the same place in both
  sheepHref?: SheepLinkProps["href"]
}

export const SheepGridContainer = ({
  imageComponent,
  sheepHref = "/",
}: SheepGridContainerProps) => {
  return (
    <Grid container>
      <Grid item md={2} className="grid-spacer-md-2" />
      <Grid item xs={12} sm={6} md={4}>
        <Box className="w-1/2 sm:w-full m-auto">
          <SheepLink href={sheepHref}>{imageComponent}</SheepLink>
        </Box>
      </Grid>
      <Grid item sm={6} md={4} className="text-center w-full">
        <Image
          src={titleDreamingsheep}
          alt="dreamingsheep"
          width={325}
          height={75}
          className="w-full h-auto max-w-[325px]"
        />
      </Grid>
    </Grid>
  )
}

export default SheepGridContainer
