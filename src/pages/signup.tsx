import Image from "next/image"
import { useRouter } from "next/router"
import { BlitzPage, Routes } from "@blitzjs/next"
import { SignupForm } from "src/auth/components/SignupForm"
import Layout from "src/core/layouts/Layout"
import sheepSignup from "public/assets/sheep-signup.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { Box, Container, Grid } from "@mui/material"

const SignupPage: BlitzPage = () => {
  const router = useRouter()

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
              src={sheepSignup}
              alt="signup sheep"
              width={384}
              height={384}
              className="w-full h-auto"
            />
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
          <h1 className="sr-only">Sign up</h1>
          <SignupForm onSuccess={() => router.push(Routes.VerifyUserPage())} />
        </Grid>
      </Grid>
    </Container>
  )
}

SignupPage.redirectAuthenticatedTo = () => Routes.DreamsPage()
SignupPage.getLayout = (page) => (
  <Layout
    title="Sign up"
    description="Create a free dreamingsheep account and start journaling your dreams — only an email is needed, no strings (or subscriptions) attached."
  >
    {page}
  </Layout>
)

export default SignupPage
