import classnames from "src/utils/classnames"
import Image from "next/image"
import { useSession } from "src/auth/client"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import { getQueryClient, queryKeyFor, useQuery } from "src/core/rpc-client"
import { useRouter } from "next/router"
import React, { Fragment, Suspense, useEffect } from "react"
import Layout from "src/core/layouts/Layout"
import { getUser } from "src/users/client"
import { UpdateUserForm } from "src/users/components/UpdateUserForm"
import { Alert, Container, Grid, Box } from "@mui/material"
import titleSettings from "public/assets/title-settings.png"
import sheepSettings from "public/assets/sheep-settings.png"
import sheepOffline from "public/assets/sheep-offline.png"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import { useOnlineStatus } from "src/core/offline/onlineStatus"

export const Settings = () => {
  const router = useRouter()
  const session = useSession()
  const online = useOnlineStatus()
  const params = { id: session.userId! }
  const hasCached = !!getQueryClient().getQueryData(queryKeyFor(getUser, params))
  const [user, { refetch }] = useQuery(getUser, params, {
    // NOTE: `staleTime: Infinity` was a fix for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110 —
    // it ensured the query never refreshes and overwrites the form data while the user is editing
    // staleTime: Infinity,
    enabled: !!session.userId && (online || hasCached),
  })

  useEffect(() => {
    if (!session.userId) router.push(Routes.Home())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // never cached on this device and offline: nothing to show, and nothing to edit
  if (!user)
    return (
      <Container>
        <Alert severity="info" className="mb-4">
          settings aren&apos;t available offline — reconnect to change anything here
        </Alert>
      </Container>
    )

  return (
    <Fragment>
      <Container>
        {!online && (
          <Alert severity="info" className="mb-4">
            settings aren&apos;t available offline — reconnect to change anything here
          </Alert>
        )}
        <Grid container>
          <Grid item md={2} className="grid-spacer-md-2" />
          <Grid item xs={12} sm={6} md={4}>
            <Box
              className={classnames(
                "w-1/2 sm:w-full",
                user ? "m-auto" : "mt-0 mx-auto -mb-8 sm:m-auto"
              )}
            >
              <Image
                src={online ? sheepSettings : sheepOffline}
                alt="settings sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </Box>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={2} className="grid-spacer-md-2" />
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
