import Head from "next/head"
import Link from "next/link"
import Image from "next/image"
import { AppPage as BlitzPage } from "src/core/types"
import { Fragment, Suspense } from "react"
import Layout from "src/core/layouts/Layout"
import { Card, CardContent, CardHeader, Container, Grid, Typography, Alert } from "@mui/material"
import sheepPrivacy from "public/assets/sheep-privacy.png"
import ogCoverImagePrivacyPolicy from "public/assets/cover1200x630-privacy-policy.jpg"
import titlePrivacyPolicy from "public/assets/title-privacy-policy.png"
import AuthenticationContainer from "src/core/components/AuthenticationContainer"
import SheepGridContainer from "src/core/components/SheepGridContainer"
import deleteCookies from "public/assets/delete-cookies-miguel-FERNANDEZ-gegen-den-strich.jpg"

const PrivacyPolicyPage: BlitzPage = () => {
  return (
    <Fragment>
      <Head>
        <title>Privacy Policy | dreamingsheep</title>
      </Head>
      <Container>
        <Suspense
          fallback={
            <SheepGridContainer
              imageComponent={
                <Image
                  src={sheepPrivacy}
                  alt="privacy sheep"
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
                src={sheepPrivacy}
                alt="privacy sheep"
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
              <Image src={titlePrivacyPolicy} alt="Privacy policy" width="195" height="55" />
              <span className="sr-only">Privacy policy</span>
            </h1>

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Last updated:</strong> 14 February 2026, <strong> Data Controller:</strong>{" "}
              Tóth Tamás, Serbia
            </Alert>

            {/* ==================== LEGAL SECTION ==================== */}
            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Data We Collect" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="my-0">
                    <li>
                      <strong>Email address</strong> — Required for account creation and password
                      recovery
                    </li>
                    <li>
                      <strong>Password</strong> — Stored securely using one-way hashing (we cannot
                      see it)
                    </li>
                    <li>
                      <strong>Username</strong> — Optional, for display purposes, to replace your
                      email in the top navbar
                    </li>
                    <li>
                      <strong>Dream journal data</strong> — Your dream entries (title, description,
                      notes, date, mood, type, time, recall, favorite status), linked symbols, and
                      custom symbol images you upload (stored on AWS S3)
                    </li>
                    <li>
                      <strong>Usage analytics</strong> — Anonymous data via Google Analytics
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Why We Collect It" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="my-0">
                    <li>
                      <strong>Email/Password</strong> — To authenticate you and recover your account
                    </li>
                    <li>
                      <strong>Dream journal data</strong> — To provide the core journaling service
                    </li>
                    <li>
                      <strong>Analytics</strong> — To understand how people use the app and improve
                      it
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Legal Basis (GDPR)" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  We process your data based on: (a) <strong>Contract</strong> — to provide the
                  service you signed up for, and (b) <strong>Legitimate interest</strong> — for
                  anonymous analytics to improve the service.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Data Retention" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="my-0">
                    <li>Your data is kept as long as your account is active</li>
                    <li>
                      When you delete your account, your data is removed immediately. Automated
                      backups may retain data for up to 90 days before being overwritten.
                    </li>
                    <li>Inactive accounts may be deleted after 2 years (with notice)</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Your Rights" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  You have the right to:
                  <ul className="mb-0">
                    <li>
                      <strong>Access</strong> — Export all your data from Settings
                    </li>
                    <li>
                      <strong>Rectify</strong> — Edit your profile and dreams anytime
                    </li>
                    <li>
                      <strong>Delete</strong> — Delete your account from Settings
                    </li>
                    <li>
                      <strong>Portability</strong> — Download your dreams as PDF
                    </li>
                    <li>
                      <strong>Object</strong> — Analytics are anonymous and not tied to your
                      account. You can block Google Analytics using browser extensions such as{" "}
                      <Link href="https://tools.google.com/dlpage/gaoptout">
                        Google&apos;s official opt-out add-on
                      </Link>
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Third-Party Services" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="my-0">
                    <li>
                      <strong>AWS S3</strong> (US) — Stores custom symbol images
                    </li>
                    <li>
                      <strong>Google Analytics</strong> (US) — Anonymous usage statistics
                    </li>
                    <li>
                      <strong>Google reCAPTCHA</strong> — Spam protection on signup
                    </li>
                    <li>
                      <strong>Gmail</strong> — Sends transactional emails (welcome, password reset)
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader
                title="International Transfers"
                sx={{ paddingBottom: "0" }}
                component="h2"
              />
              <CardContent>
                <Typography variant="body1">
                  Some data may be processed in the United States through our service providers
                  (AWS, Google). These transfers are protected by Standard Contractual Clauses and
                  the providers&apos; privacy frameworks.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Cookies" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" component="div">
                  <ul className="my-0">
                    <li>
                      <strong>Session cookie</strong> — Keeps you logged in (essential, prefix:{" "}
                      <code>dreamingsheep.*</code>)
                    </li>
                    <li>
                      <strong>Google Analytics cookies</strong> — Anonymous usage statistics
                      (optional, can be blocked with browser extensions)
                    </li>
                    <li>
                      <strong>Google reCAPTCHA cookies</strong> — Spam protection during signup
                      (loaded only on signup page)
                    </li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Security" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  We use HTTPS encryption, secure password hashing, and regular backups. However, no
                  system is 100% secure. We recommend using a unique password.
                </Typography>
              </CardContent>
            </Card>

            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="Contact" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1">
                  For privacy questions or to exercise your rights:{" "}
                  <Link href="mailto:meh@dreamingsheep.net">meh@dreamingsheep.net</Link>
                </Typography>
              </CardContent>
            </Card>

            {/* ==================== FUN SECTION ==================== */}
            <Card className="bg-mui-secondary-light mb-4">
              <CardHeader title="The Fun Stuff" sx={{ paddingBottom: "0" }} component="h2" />
              <CardContent>
                <Typography variant="body1" sx={{ fontStyle: "italic", mb: 2 }}>
                  Now that the lawyers are satisfied, here&apos;s the human version...
                </Typography>

                <Typography variant="h6" component="h3">
                  Email and password
                </Typography>
                <Typography variant="body1" sx={{ marginBottom: "1.5rem" }}>
                  With great password comes <em>low</em> responsibility.
                </Typography>

                <Typography variant="h6" component="h3">
                  Google Analytics data
                </Typography>
                <Typography variant="body1" sx={{ marginBottom: "1.5rem" }}>
                  Technically it is possible to track your every move, the question is, is it worth
                  it? (Hint: it is not.) We are using it anonymously for improving the UI/UX.
                </Typography>

                <Typography variant="h6" component="h3">
                  Cookies
                </Typography>
                <Typography variant="body1" sx={{ marginBottom: "1.5rem" }}>
                  We collect the cookies for the{" "}
                  <Link href="https://en.wikipedia.org/wiki/Cookie_Monster">Cookie Monster</Link>{" "}
                  from the Sesame Street only. In return he helps us in session management.
                </Typography>

                <Image
                  src={deleteCookies}
                  alt="FERNANDEZ - gegen den Strich"
                  width={353}
                  height={500}
                  className="w-full h-auto sm:w-auto mx-auto block"
                />
                <Typography variant="body1" align="right">
                  ²
                </Typography>

                <Typography variant="h6" component="h3">
                  Dreams
                </Typography>
                <Typography variant="body1" sx={{ marginBottom: "1.5rem" }}>
                  Not only we stalk your dreams, we are going to steal your soul{" "}
                  <span className="lucidicon lucidicon-scream"></span> bwahaha! Jokes aside, we are
                  too busy fulfilling our own dreams but if you are a Paranoid Android¹{" "}
                  <span className="lucidicon lucidicon-c-3po"></span>&#32;and don&apos;t trust us,
                  it&apos;s best to keep your journal in a notebook.
                </Typography>

                <Typography variant="h6" component="h3">
                  Terms of Service
                </Typography>
                <Typography variant="body1" sx={{ marginBottom: "1.5rem" }}>
                  By signing up, you have already sold your soul to <em>dreamingsheep</em>. The
                  Terms of Service just makes it official. Don&apos;t worry — we accept returns
                  within 90 dream-days, no receipt needed.
                </Typography>

                <hr />
                <Typography variant="body1">
                  <small>1 - Radiohead - Paranoid Android</small>
                  <br />
                  <small>
                    2 - &copy;{" "}
                    <Link href="https://www.facebook.com/gegendenstrich/">
                      FERNANDEZ - gegen den Strich
                    </Link>
                  </small>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Grid container>
          <Grid item md={3} />
          <Grid item md={6}>
            <Alert severity="warning" sx={{ marginTop: "1rem" }}>
              If you are a serious person and still consider taking legal action against
              dreamingsheep, please <Link href="mailto:meh@dreamingsheep.net">contact us</Link>{" "}
              first and we will try to resolve the issues you are concerned about. Thank you!
            </Alert>
          </Grid>
        </Grid>
      </Container>
    </Fragment>
  )
}

PrivacyPolicyPage.authenticate = false
PrivacyPolicyPage.getLayout = (page) => (
  <Layout
    title="Privacy policy"
    description="dreamingsheep collects only your email and your dream entries. Dreams stay private to you, and you can export or delete everything from Settings."
    ogCoverImage={ogCoverImagePrivacyPolicy.src}
  >
    {page}
  </Layout>
)

export default PrivacyPolicyPage
