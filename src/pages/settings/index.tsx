import Image from "next/image"
import { useSession } from "@blitzjs/auth"
import { BlitzPage, Routes } from "@blitzjs/next"
import { useQuery } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import React, { Fragment, Suspense, useEffect } from "react"
import Layout from "src/core/layouts/Layout"
import getUser from "src/users/queries/getUser"
import { UpdateUserForm } from "src/users/components/UpdateUserForm"
import { Container, Grid, Box } from "@mui/material"
import titleSettings from "public/assets/title-settings.png"
import sheepSettings from "public/assets/sheep-settings.png"
import LoadingSpiral from "src/core/components/LoadingSpiral"

export const Settings = () => {
  const router = useRouter()
  const session = useSession()
  const [user, { refetch }] = useQuery(
    getUser,
    { id: session.userId! },
    {
      // NOTE: `staleTime: Infinity` was a fix for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110 —
      // it ensured the query never refreshes and overwrites the form data while the user is editing
      // staleTime: Infinity,
      enabled: !!session.userId,
    }
  )

  useEffect(() => {
    if (!session.userId) router.push(Routes.Home())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Fragment>
      <Container>
        <Grid container>
          <Grid item md={2} />
          <Grid item xs={12} sm={6} md={4}>
            <Box
              sx={{
                width: { xs: "50%", sm: "100%" },
                ...(user && {
                  margin: "auto",
                }),
                ...(!user && {
                  margin: { xs: "0 auto -2rem", sm: "auto" },
                }),
              }}
            >
              <Image
                src={sheepSettings}
                alt="settings sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </Box>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={2} />
          <Grid item md={8}>
            <h1 className="heading">
              <Image src={titleSettings} alt="Settings" width="130" height="55" />
              <span className="sr-only">Settings</span>
            </h1>
            {/* NOTE: reload instead of refetch is a fix for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110.
                TODO (future-feature): debug further and restore the refetch variant */}
            {/* <UpdateUserForm initialValues={{ ...user }} onSuccess={refetch} /> */}
            <UpdateUserForm initialValues={{ ...user }} onSuccess={router.reload} />
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

const SettingsPage: BlitzPage = () => {
  return (
    <div>
      <Suspense fallback={<LoadingSpiral />}>
        <Settings />
      </Suspense>
    </div>
  )
}

SettingsPage.authenticate = true
SettingsPage.getLayout = (page) => <Layout title="Settings">{page}</Layout>

export default SettingsPage
