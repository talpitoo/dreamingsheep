import Link from "next/link"
import Image from "next/image"
import { useMutation } from "src/core/rpc-client"
import { useRouter } from "next/router"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import Layout from "src/core/layouts/Layout"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/core/components/Form"
import { ResetPassword } from "src/auth/validations"
import { resetPassword } from "src/auth/client-mutations"
import { Box, Card, CardHeader, CardContent, Container, Grid, Typography } from "@mui/material"
import sheepNewPassword from "public/assets/sheep-new-password.png"
import titleDreamingsheep from "public/assets/title-dreamingsheep.png"
import { useMemo } from "react"

const ResetPasswordPage: BlitzPage = () => {
  const router = useRouter()
  const token = useMemo(() => router.query.token, [router.query.token])
  const [resetPasswordMutation, { isSuccess }] = useMutation(resetPassword)

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
              src={sheepNewPassword}
              alt="new password sheep"
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
          <Card className="text-left">
            <CardHeader title="Set a new password" sx={{ paddingBottom: "0" }} component="h1" />
            <CardContent>
              {isSuccess && (
                <div>
                  <h3>Password reset successfully</h3>
                  <p>
                    Go to the <Link href={Routes.Home()}>homepage</Link>
                  </p>
                </div>
              )}
              {!isSuccess && token && (
                <Form
                  submitText="Update password"
                  schema={ResetPassword}
                  initialValues={{
                    password: "",
                    passwordConfirmation: "",
                    token: token as string,
                  }}
                  onSubmit={async (values) => {
                    try {
                      await resetPasswordMutation(values)
                    } catch (error: any) {
                      if (error.name === "ResetPasswordError") {
                        return {
                          [FORM_ERROR]: error.message,
                        }
                      } else {
                        return {
                          [FORM_ERROR]: "Sorry, we had an unexpected error. Please try again.",
                        }
                      }
                    }
                  }}
                >
                  <LabeledTextField
                    name="password"
                    label="New password"
                    placeholder="New password"
                    type="password"
                    // className="rounded-top"
                    inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="translate-x-0 translate-y-0 transform-gpu"
                  />
                  <LabeledTextField
                    name="passwordConfirmation"
                    label="Confirm new password"
                    placeholder="Confirm new password"
                    type="password"
                    // className="rounded-bottom"
                    inputProps={{
                      sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
                    }}
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
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

ResetPasswordPage.redirectAuthenticatedTo = () => Routes.DreamsPage()
ResetPasswordPage.getLayout = (page) => <Layout title="Reset your password">{page}</Layout>

export default ResetPasswordPage
