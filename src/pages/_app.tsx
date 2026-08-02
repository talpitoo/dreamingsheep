import Script from "next/script"
import Image from "next/image"
import type { AppProps } from "next/app"
import { useRouter } from "next/router"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { QueryClientProvider, useQueryErrorResetBoundary } from "@tanstack/react-query"

import "src/styles/fonts.css"
import "src/styles/index.css"

import LoginForm from "src/auth/components/LoginForm"
import CreateInstantSymbolProvider from "src/contexts/CreateInstantSymbolContext"
import Theme from "src/styles/Theme"
import React, { useEffect, useState } from "react"

import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider } from "@mui/material/styles"
import { LocalizationProvider } from "@mui/x-date-pickers"
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon"
import Layout from "src/core/layouts/Layout"
import { Alert, Container, Grid, Box } from "@mui/material"
import sheepSignup from "public/assets/sheep-signup.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import CustomErrorContainer from "src/core/components/CustomErrorContainer"
import { AuthenticationError, AuthorizationError } from "src/core/errors"
import { getQueryClient } from "src/core/rpc-client"
import { useSession } from "src/auth/client"
import { ErrorStatus } from "src/core/components/ErrorStatus"
import type { AppPage } from "src/core/types"
import { CacheProvider, EmotionCache } from "@emotion/react"
import Head from "next/head"
import createEmotionCache from "src/createEmotionCache"

const clientSideEmotionCache = createEmotionCache()
const queryClient = getQueryClient()

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache
  Component: AppProps["Component"] & AppPage
}

export default function App({
  Component,
  emotionCache = clientSideEmotionCache,
  pageProps,
}: MyAppProps) {
  const getLayout = Component.getLayout || ((page) => page)

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
              <AppErrorBoundary>
                <CreateInstantSymbolProvider>
                  {getLayout(
                    <AuthGuard Component={Component}>
                      <Component {...pageProps} />
                    </AuthGuard>
                  )}
                </CreateInstantSymbolProvider>
              </AppErrorBoundary>
            </ThemeProvider>
          </CacheProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </>
  )
}

function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback} onReset={reset}>
      {children}
    </ErrorBoundary>
  )
}

// Honors the Blitz-era page statics. authenticate=true throws AuthenticationError
// from render (after mount, when the session cookie is readable) so the SAME
// ErrorBoundary login fallback appears as before; redirectAuthenticatedTo pushes
// away logged-in visitors of the signup/verify/forgot/reset pages.
function AuthGuard({ Component, children }: { Component: AppPage; children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const [authError, setAuthError] = useState<Error | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (Component.authenticate === true && !session.userId) {
      setAuthError(new AuthenticationError())
    } else if (authError && session.userId) {
      setAuthError(null)
    }
    if (Component.redirectAuthenticatedTo && session.userId) {
      const to = Component.redirectAuthenticatedTo
      void router.push(typeof to === "function" ? to() : to)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Component, session.userId])

  if (authError) throw authError
  // Private pages never render their body on the server (spike finding: their
  // components destructure query results, and server-side query data is
  // undefined) — the layout chrome still SSRs because AuthGuard sits inside
  // getLayout. The body appears on mount, where suspense fallbacks take over.
  if (Component.authenticate === true && !mounted) {
    return null
  }
  // suppressFirstRenderFlicker parity: Blitz hid the first paint of pages that
  // set this flag (Home uses it) until the client knows the session
  if (Component.suppressFirstRenderFlicker && !mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }
  return <>{children}</>
}

function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  if (error instanceof AuthenticationError) {
    return (
      <Layout>
        <Container>
          {/* error/login fallback states must never be indexed (the other branches
              get this via CustomErrorContainer) */}
          <Head>
            <meta name="robots" content="noindex" />
          </Head>
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
      <Layout>
        <CustomErrorContainer>
          <ErrorStatus
            statusCode={error.statusCode}
            title="Sorry, you are not authorized to access this"
          />
        </CustomErrorContainer>
      </Layout>
    )
  }

  // wrapped in Layout so error states (offline, unexpected failures, ...) keep the
  // header/footer instead of rendering a bare page
  return (
    <Layout>
      <CustomErrorContainer>
        <ErrorStatus
          statusCode={(error as { statusCode?: number }).statusCode || 400}
          title={error.message || error.name}
        />
      </CustomErrorContainer>
    </Layout>
  )
}
