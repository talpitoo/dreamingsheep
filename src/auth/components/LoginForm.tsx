import Link from "next/link"
import { Routes } from "@blitzjs/next"
import { useMutation } from "@blitzjs/rpc"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/core/components/Form"
import login from "src/auth/mutations/login"
import { Login } from "src/auth/validations"
import React from "react"
import { Card, CardContent } from "@mui/material"
import { AuthenticationError } from "blitz"
import { User } from "db"

type LoginFormProps = {
  onSuccess?: (user: Omit<User, "hashedPassword">) => void
}

export const LoginForm = (props: LoginFormProps) => {
  const [loginMutation] = useMutation(login)

  return (
    <Card sx={{ textAlign: "left" }}>
      <CardContent>
        <Form
          submitText="Log in"
          schema={Login}
          initialValues={{ email: "", password: "" }}
          onSubmit={async (values) => {
            try {
              const user = await loginMutation(values)
              props.onSuccess?.(user)
            } catch (error: any) {
              if (error instanceof AuthenticationError) {
                return { [FORM_ERROR]: "Sorry, those credentials are invalid" }
              } else {
                return {
                  [FORM_ERROR]:
                    "Sorry, we had an unexpected error. Please try again. - " + error.toString(),
                }
              }
            }
          }}
        >
          <LabeledTextField
            name="email"
            label="Email"
            placeholder="Email"
            fullWidth
            autoComplete="email"
            // className="rounded-top"
            inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
            inputLabelProps={{ shrink: true, disableAnimation: true }}
            className="translate-x-0 translate-y-0 transform-gpu"
          />
          <LabeledTextField
            name="password"
            label="Password"
            placeholder="Password"
            type="password"
            fullWidth
            // className="rounded-bottom"
            inputProps={{
              sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
            }}
            inputLabelProps={{ shrink: true, disableAnimation: true }}
            className="translate-x-0 translate-y-0 transform-gpu"
          />
        </Form>
        <p className="text-right pt-4">
          <Link href={Routes.ForgotPasswordPage()}>Forgot your password?</Link>
        </p>
        <p className="text-right">
          Don&apos;t have an account? <Link href={Routes.SignupPage()}>Sign up</Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default LoginForm
