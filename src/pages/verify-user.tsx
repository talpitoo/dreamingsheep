import Image from "next/image"
import { BlitzPage, Routes } from "@blitzjs/next"
import Layout from "src/core/layouts/Layout"
import sheepMail from "public/assets/sheep-mail.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { Box, Container, Grid } from "@mui/material"
import { useRouter } from "next/router"
import VerifyUserForm from "src/auth/components/VerifyUserForm"
import { useEffect } from "react"
import { useSession } from "@blitzjs/auth"

const VerifyUserPage: BlitzPage = () => {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!session.username || !session.verifyUserToken) {
      router.push(Routes.Home())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container>
      <Grid container>
        <Grid item md={2} />
        <Grid item xs={12} sm={6} md={4}>
          <Box
            sx={{
              width: { xs: "50%", sm: "100%" },
              margin: { xs: "0 auto -2rem", sm: "auto" },
            }}
          >
            <Image
              src={sheepMail}
              alt="mail sheep"
              width={384}
              height={384}
              className="w-full h-auto max-w-[325px]"
            />
          </Box>
        </Grid>
        <Grid item sm={6} md={4} className="text-center w-full">
          <h1>
            <Image
              src={titleDreamingsheep}
              alt="dreamingsheep"
              width={325}
              height={75}
              className="w-full h-auto max-w-[325px]"
            />
            <span className="sr-only">Verification code</span>
          </h1>
          <VerifyUserForm onSuccess={() => router.push(Routes.DreamsPage())} />
        </Grid>
      </Grid>
    </Container>
  )
}

VerifyUserPage.redirectAuthenticatedTo = () => Routes.DreamsPage()
VerifyUserPage.getLayout = (page) => <Layout title="Verification code">{page}</Layout>

export default VerifyUserPage
