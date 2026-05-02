import Image from "next/image"
import { useMutation } from "@blitzjs/rpc"
import { BlitzPage, Routes } from "@blitzjs/next"
import Layout from "src/core/layouts/Layout"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/core/components/Form"
import { ForgotPassword } from "src/auth/validations"
import forgotPassword from "src/auth/mutations/forgotPassword"
import { Box, Card, CardHeader, CardContent, Container, Grid, Typography } from "@mui/material"
import sheepForgotPassword from "public/assets/sheep-forgot-password.png"
import sheepMail from "public/assets/sheep-mail.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { useSession } from "@blitzjs/auth"
import { useRouter } from "next/router"
import { useEffect } from "react"

const ForgotPasswordPage: BlitzPage = () => {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword)

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
            {isSuccess ? (
              <Image
                src={sheepMail}
                alt="mail sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            ) : (
              <Image
                src={sheepForgotPassword}
                alt="forgot password sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            )}
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
          <Card className="text-left">
            <CardHeader title="Forgot your password?" sx={{ paddingBottom: "0" }} component="h1" />
            <CardContent>
              {isSuccess ? (
                <div>
                  <h3>Request submitted</h3>
                  <p>
                    If your email is in our system, you will receive instructions to reset your
                    password shortly.
                  </p>
                </div>
              ) : (
                <Form
                  submitText="Reset password"
                  schema={ForgotPassword}
                  initialValues={{ email: "" }}
                  onSubmit={async (values) => {
                    try {
                      await forgotPasswordMutation(values)
                    } catch (error: any) {
                      return {
                        [FORM_ERROR]: "Sorry, we had an unexpected error. Please try again.",
                      }
                    }
                  }}
                >
                  <LabeledTextField
                    name="email"
                    label="Email"
                    placeholder="Email"
                    fullWidth
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    className="translate-x-0 translate-y-0 transform-gpu"
                  />
                </Form>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}

ForgotPasswordPage.redirectAuthenticatedTo = () => Routes.DreamsPage()
ForgotPasswordPage.getLayout = (page) => <Layout title="Forgot your password?">{page}</Layout>

export default ForgotPasswordPage
