import Image from "next/image"
import { Box, Grid } from "@mui/material"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import LoginForm from "src/auth/components/LoginForm"
import { Fragment, ReactNode } from "react"
import { useSession } from "src/auth/client"
import { useRouter } from "next/router"
import { Routes } from "src/routes"
import Link from "next/link"
import CookieNotice from "./CookieNotice"

interface AuthenticationContainerProps {
  imageComponent: ReactNode
}

export const AuthenticationContainer = ({ imageComponent }: AuthenticationContainerProps) => {
  const session = useSession()
  const router = useRouter()

  return (
    <Grid container>
      <Grid item md={2} />
      <Grid item xs={12} sm={6} md={4}>
        <Box
          sx={{
            width: { xs: "50%", sm: "100%" },
            ...(session.userId && {
              margin: "auto",
            }),
            ...(!session.userId && {
              margin: { xs: "0 auto -2rem", sm: "auto" },
            }),
          }}
        >
          <Link href="/">{imageComponent}</Link>
        </Box>
      </Grid>
      <Grid item sm={6} md={4} className="text-center w-full">
        {!session.userId && (
          <Fragment>
            <Image
              src={titleDreamingsheep}
              alt="dreamingsheep"
              width={325}
              height={75}
              className="w-full h-auto max-w-[325px]"
            />
            <Box sx={{ marginBottom: { xs: "2rem", sm: "0" } }}>
              <LoginForm
                onSuccess={(user) =>
                  router.push(user.verified ? Routes.DreamsPage() : Routes.VerifyUserPage())
                }
              />

              <CookieNotice />
            </Box>
          </Fragment>
        )}
      </Grid>
    </Grid>
  )
}

export default AuthenticationContainer
