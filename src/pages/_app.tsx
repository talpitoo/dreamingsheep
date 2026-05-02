import { withBlitz } from "src/blitz-client"
import Script from "next/script"
import Image from "next/image"
import { useQueryErrorResetBoundary } from "@blitzjs/rpc"

import { AppProps, ErrorBoundary, ErrorFallbackProps, ErrorComponent } from "@blitzjs/next"

import "src/styles/fonts.css"
import "src/styles/index.css"

import LoginForm from "src/auth/components/LoginForm"
import CreateInstantSymbolProvider from "src/contexts/CreateInstantSymbolContext"
import Theme from "src/styles/Theme"
import React from "react"

import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider } from "@mui/material/styles"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon"
import Layout from "src/core/layouts/Layout"
import { Alert, Container, Grid, Box } from "@mui/material"
import sheepSignup from "public/assets/sheep-signup.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import CustomErrorContainer from "src/core/components/CustomErrorContainer"
import { AuthenticationError, AuthorizationError } from "blitz"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { CacheProvider, EmotionCache } from "@emotion/react"
import Head from "next/head"
import createEmotionCache from "src/createEmotionCache"

const clientSideEmotionCache = createEmotionCache()

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache
}

export default withBlitz(function App({
  Component,
  emotionCache = clientSideEmotionCache,
  pageProps,
}: MyAppProps) {
  const getLayout = Component.getLayout || ((page) => page)
  const queryClient = new QueryClient()

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-Q5WD5QFH1P"
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-Q5WD5QFH1P', {
              page_path: window.location.pathname,
            });
        `,
        }}
      />

      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <CacheProvider value={emotionCache}>
            <ThemeProvider theme={Theme}>
              <CssBaseline />
              <ErrorBoundary
                FallbackComponent={RootErrorFallback}
                onReset={useQueryErrorResetBoundary().reset}
              >
                <CreateInstantSymbolProvider>
                  {getLayout(<Component {...pageProps} />)}
                </CreateInstantSymbolProvider>
              </ErrorBoundary>
            </ThemeProvider>
          </CacheProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </>
  )
})

function RootErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  if (error instanceof AuthenticationError) {
    return (
      <Layout>
        <Container>
          <Grid container sx={{ mb: 2 }}>
            <Grid container item sm={12} justifyContent="center">
              <Alert severity="warning">Your session expired. Please log in</Alert>
            </Grid>
          </Grid>
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
              <LoginForm onSuccess={resetErrorBoundary} />
            </Grid>
          </Grid>
        </Container>
      </Layout>
    )
  }

  if (error instanceof AuthorizationError) {
    return (
      <CustomErrorContainer>
        <ErrorComponent
          statusCode={error.statusCode}
          title="Sorry, you are not authorized to access this"
        />
      </CustomErrorContainer>
    )
  }

  return (
    <CustomErrorContainer>
      <ErrorComponent statusCode={error.statusCode || 400} title={error.message || error.name} />
    </CustomErrorContainer>
  )
}
