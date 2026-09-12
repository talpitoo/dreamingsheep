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
import classnames from "src/utils/classnames"

interface AuthenticationContainerProps {
  imageComponent: ReactNode
  // opt-in extra content on top of the login card — the landing page injects its
  // h1 + intro there; every other page omits it and renders exactly as before
  headerComponent?: ReactNode
  // same idea, below the submit button — the landing page puts the swiper's demo button there
  footerComponent?: ReactNode
}

export const AuthenticationContainer = ({
  imageComponent,
  headerComponent,
  footerComponent,
}: AuthenticationContainerProps) => {
  const session = useSession()
  const router = useRouter()

  return (
    <Grid container>
      <Grid item md={2} className="grid-spacer-md-2" />
      <Grid item xs={12} sm={6} md={4}>
        <Box
          className={classnames(
            "w-1/2 sm:w-full",
            // logged out, the sheep is pulled up over the login card below it on small screens
            session.userId ? "m-auto" : "mt-0 mx-auto -mb-8 sm:m-auto"
          )}
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
            <Box className="mb-8 sm:mb-0">
              <LoginForm
                headerComponent={headerComponent}
                footerComponent={footerComponent}
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
