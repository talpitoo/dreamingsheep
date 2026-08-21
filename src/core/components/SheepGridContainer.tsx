import Image from "next/image"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { Box, Grid } from "@mui/material"
import { ReactNode } from "react"

interface SheepGridContainerProps {
  imageComponent: ReactNode
}

export const SheepGridContainer = ({ imageComponent }: SheepGridContainerProps) => {
  return (
    <Grid container>
      <Grid item md={2} className="grid-spacer-md-2" />
      <Grid item xs={12} sm={6} md={4}>
        <Box
          sx={{
            width: { xs: "50%", sm: "100%" },
            margin: "auto",
          }}
        >
          {imageComponent}
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
