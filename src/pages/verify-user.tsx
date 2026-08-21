import Image from "next/image"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import Layout from "src/core/layouts/Layout"
import sheepMail from "public/assets/sheep-mail.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { Box, Container, Grid } from "@mui/material"
import { useRouter } from "next/router"
import VerifyUserForm from "src/auth/components/VerifyUserForm"
import { useEffect } from "react"
import { readPublicDataFromCookie } from "src/auth/client"

const VerifyUserPage: BlitzPage = () => {
  const router = useRouter()

  useEffect(() => {
    // read the cookie directly: this effect runs once on mount, and on a full
    // page load that is the hydration frame where useSession still reports the
    // empty server snapshot — deciding on it bounced users Home when they
    // refreshed /verify-user while waiting for the OTP email
    const publicData = readPublicDataFromCookie()
    if (!publicData.username || !publicData.verifyUserToken) {
      router.push(Routes.Home())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Container>
      <Grid container>
        <Grid item md={2} className="grid-spacer-md-2" />
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
