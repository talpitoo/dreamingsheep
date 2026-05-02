import Head from "next/head"
import Link from "next/link"
import Image from "next/image"
import { BlitzPage, Routes } from "@blitzjs/next"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography, Alert } from "@mui/material"
import titleTermsOfService from "public/assets/title-terms-of-service.png"
import sheepSignup from "public/assets/sheep-signup.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"

const TermsOfServicePage: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Terms of Service | dreamingsheep</title>
      </Head>
      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              imageComponent={
                <Image
                  src={sheepSignup}
                  alt="terms sheep"
                  width={384}
                  height={384}
                  className="w-full h-auto"
                />
              }
            />
          }
        >
          <AuthenticationContainer
            imageComponent={
              <Image
                src={sheepSignup}
                alt="terms sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            }
          />
        </Suspense>
        <Grid container>
          <Grid item md={2} />
          <Grid item md={8}>
            <h1 className="heading">
              <Image src={titleTermsOfService} alt="Terms of Service" width="221" height="55" />
              <span className="sr-only">Terms of Service</span>
            </h1>

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Last updated:</strong> 14 February 2026
            </Alert>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="1. What is dreamingsheep?"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <em>dreamingsheep</em> is a <strong>free, personal project</strong> created and
                  maintained by Tóth Tamás as a passion project for the lucid dreaming community.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  It is an online dream journal where you can log, analyze, and explore patterns in
                  your dreams. The service is provided free of charge, as-is, for personal,
                  non-commercial use.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="2. Acceptance of Terms"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1">
                  By accessing or using <em>dreamingsheep</em>, you agree to be bound by these{" "}
                  <em>Terms of Service</em> and our{" "}
                  <Link href={Routes.PrivacyPolicyPage()}>Privacy Policy</Link>. If you do not
                  agree, please do not use the service.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="3. User Accounts" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="mt-0">
                    <li>You must provide a valid email address to create an account</li>
                    <li>You are responsible for maintaining the security of your account</li>
                    <li>You must be at least 16 years old to use this service</li>
                    <li>One person, one account (no shared or automated accounts)</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="4. Your Content" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>You own your dreams.</strong> All dream entries, notes, and custom symbols
                  you create remain your intellectual property.
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  By using <em>dreamingsheep</em>, you grant us a limited license to store and
                  display your content back to you. We do not claim ownership of your content, and
                  we do not sell, share, or analyze your dreams.
                </Typography>
                <Typography variant="body1">
                  You can export or delete your data at any time from the Settings page.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="5. Acceptable Use" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  You agree not to:
                  <ul>
                    <li>Use the service for any illegal purpose</li>
                    <li>Attempt to access other users&apos; accounts or data</li>
                    <li>Upload malicious content or attempt to compromise the service</li>
                    <li>Use automated tools to scrape or overload the service</li>
                    <li>Impersonate others or misrepresent your identity</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="6. Service Availability"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <em>dreamingsheep</em> is provided <strong>&quot;as is&quot;</strong> without any
                  guarantees. As a personal project:
                </Typography>
                <Typography variant="body1" component="div">
                  <ul className="mt-0">
                    <li>The service may be unavailable for maintenance or updates</li>
                    <li>Features may change or be removed</li>
                    <li>We cannot guarantee 24/7 uptime or immediate bug fixes</li>
                    <li>Backups are performed regularly, but data loss is possible</li>
                  </ul>
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  <strong>Recommendation:</strong> Regularly export your dreams as a backup.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="7. Limitation of Liability"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  To the maximum extent permitted by law:
                </Typography>
                <Typography variant="body1" component="div">
                  <ul className="mt-0">
                    <li>
                      <em>dreamingsheep</em> and its creator are not liable for any damages arising
                      from your use of the service
                    </li>
                    <li>
                      We are not responsible for any data loss, service interruptions, or security
                      breaches beyond our reasonable control
                    </li>
                    <li>This service is not a substitute for professional mental health support</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="8. Account Termination"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="mt-0">
                    <li>You can delete your account at any time from Settings</li>
                    <li>We may suspend or terminate accounts that violate these terms</li>
                    <li>
                      Inactive accounts may be deleted after 2 years of inactivity (with notice)
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="9. Changes to Terms" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  We may update these terms occasionally. Significant changes will be announced on
                  the blog or via email. Continued use after changes constitutes acceptance.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="10. Contact" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  Questions about these terms? Contact us at{" "}
                  <Link href="mailto:meh@dreamingsheep.net">meh@dreamingsheep.net</Link>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container>
          <Grid item md={3} />
          <Grid item md={6}>
            <Alert severity="warning" sx={{ marginTop: "1rem" }}>
              <strong>Remember:</strong> <em>dreamingsheep</em> is a labor of love, not a
              corporation. We do our best to keep your dreams safe, but please keep local backups of
              important entries. Sweet dreams!
            </Alert>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

TermsOfServicePage.authenticate = false
TermsOfServicePage.getLayout = (page) => <Layout title="Terms of Service">{page}</Layout>

export default TermsOfServicePage
