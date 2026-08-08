import Link from "next/link"
import { useMutation } from "src/core/rpc-client"
import { Routes } from "src/routes"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/core/components/Form"
import { signup } from "src/auth/client-mutations"
import { Signup } from "src/auth/validations"
import { Card, CardHeader, CardContent, Typography } from "@mui/material"
import FormControlLabel from "@mui/material/FormControlLabel"
import Checkbox from "@mui/material/Checkbox"
import React, { useState } from "react"
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3"

type SignupFormProps = {
  onSuccess?: () => void
}

const SignupFormComponent = (props: SignupFormProps) => {
  const [signupMutation] = useMutation(signup)
  const { executeRecaptcha } = useGoogleReCaptcha()

  // Separate honeypot value state
  const [user_name, setUser_name] = useState<string>("")

  return (
    <Card className="text-left">
      <CardHeader title="New to dreamingsheep?" sx={{ paddingBottom: "0" }} component="h2" />
      <CardContent>
        <Form
          submitText="Sign up"
          // schema={Signup}
          schema={Signup.omit({ user_name: true })} // Exclude honeypot from validation
          initialValues={{ email: "", password: "", recaptchaToken: "" }}
          onSubmit={async (values) => {
            // Check honeypot value separately
            if (user_name) {
              // If honeypot is filled, do nothing
              return {}
            }
            try {
              let token = ""
              if (executeRecaptcha) {
                try {
                  token = await executeRecaptcha("signup_form")
                } catch (error) {
                  console.error("Error executing reCAPTCHA:", error)
                  return { [FORM_ERROR]: "Failed to verify reCAPTCHA. Please try again." }
                }
              }
              // console.log("Generated reCAPTCHA token:", token)
              await signupMutation({ ...values, user_name: "", recaptchaToken: token })
              props.onSuccess?.()
            } catch (error: any) {
              if (error.code === "P2002" && error.meta?.target?.includes("email")) {
                // This error comes from Prisma
                return { email: "This email is already being used" }
              } else {
                return { [FORM_ERROR]: error.toString() }
              }
            }
          }}
        >
          <LabeledTextField
            name="email"
            label="Email"
            placeholder="Email"
            type="email"
            // className="rounded-top"
            inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
            inputLabelProps={{ shrink: true, disableAnimation: true }}
            fullWidth
            className="translate-x-0 translate-y-0 transform-gpu"
          />
          <LabeledTextField
            name="password"
            label="Password"
            placeholder="Password"
            type="password"
            // className="rounded-bottom"
            inputProps={{
              sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
            }}
            inputLabelProps={{ shrink: true, disableAnimation: true }}
            fullWidth
            className="translate-x-0 translate-y-0 transform-gpu"
          />
          {/* NOTE: 'honeypot' spam protection */}
          <input
            type="text"
            name="user_name"
            value={user_name}
            onChange={(e) => setUser_name(e.target.value)}
            style={{ display: "none" }}
          />
          <FormControlLabel
            control={<Checkbox value="privacy-policy" className="-mt-2" />}
            required
            className="mt-4 flex items-start"
            label={
              <p className="leading-tight">
                By registering, I confirm that I have read and agree to the{" "}
                <Link href={Routes.PrivacyPolicyPage()} passHref={true}>
                  Privacy policy
                </Link>
                .
              </p>
            }
          />
        </Form>
        <p className="text-right pt-4">
          Already have an account? <Link href={Routes.Home()}>Log in</Link>
        </p>
      </CardContent>
    </Card>
  )
}

export const SignupForm = (props: SignupFormProps) => (
  <GoogleReCaptchaProvider
    reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
    container={{
      // element: "recaptcha-wrapper", // optional to render inside custom element
      parameters: {
        badge: "bottomright", // optional, default undefined or "inline", "bottomleft"
      },
    }}
  >
    <SignupFormComponent {...props} />
  </GoogleReCaptchaProvider>
)
