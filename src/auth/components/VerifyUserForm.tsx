import { useMutation } from "src/core/rpc-client"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { Form, FORM_ERROR } from "src/core/components/Form"
import { verifyUser } from "src/auth/client-mutations"
import { VerifyUser } from "src/auth/validations"
import React, { useState } from "react"
import { Card, CardHeader, CardContent, Typography } from "@mui/material"
import { resendOtp } from "src/auth/client-mutations"
import Link from "next/link"
import { useRouter } from "next/router"
import { Routes } from "src/routes"

type VerifyUserFormProps = {
  onSuccess?: () => void
}

export const VerifyUserForm = ({ onSuccess }: VerifyUserFormProps) => {
  const router = useRouter()
  const [verifyUserMutation] = useMutation(verifyUser)
  const [resendOtpMutation] = useMutation(resendOtp)
  const [resendOtpError, setResendOtpError] = useState<string | null>(null)

  return (
    <Card className="text-left">
      <CardHeader title="Check your email" sx={{ paddingBottom: "0" }} component="h2" />
      <CardContent>
        <Form
          submitText="Let me in"
          schema={VerifyUser}
          initialValues={{ code: "" }}
          onSubmit={async (values) => {
            try {
              await verifyUserMutation(values)
              onSuccess?.()
            } catch (error: any) {
              if (error.name === "UserSessionError" || error.name === "UserVerifiedError") {
                router.push(Routes.Home())
              } else {
                if (error.name === "VerifyUserError") {
                  return { code: error.message }
                }
                return { [FORM_ERROR]: error.toString() }
              }
            }
          }}
        >
          <LabeledTextField
            name="code"
            label="Verification code"
            placeholder="Verification code"
            fullWidth
            className="translate-x-0 translate-y-0 transform-gpu"
            inputLabelProps={{ shrink: true, disableAnimation: true }}
          />
        </Form>
        <p className="text-right pt-4">
          <Link
            href="#"
            onClick={async () => {
              try {
                await resendOtpMutation()
                setResendOtpError(null)
              } catch (error: any) {
                setResendOtpError(error.message || "Resend OTP Failed")
                if (error.name === "UserSessionError" || error.name === "UserVerifiedError") {
                  router.push(Routes.Home())
                }
              }
            }}
          >
            Resend verification code
          </Link>
        </p>
        {!!resendOtpError && (
          <Typography variant="caption" sx={{ color: "red" }}>
            {resendOtpError}
          </Typography>
        )}
        {/* <p className="text-right">
          <Link href="#" onClick={async () => router.push(Routes.Home())}>
            Back To Login
          </Link>
        </p> */}
      </CardContent>
    </Card>
  )
}

export default VerifyUserForm
