import Link from "next/link"
import { useRouter } from "next/router"
import { useMutation } from "src/core/rpc-client"
import { Routes } from "src/routes"
import { Form, FormProps } from "src/core/components/Form"
import { LabeledTextField } from "src/core/components/LabeledTextField"
import { SymbolsRadioList } from "src/core/components/SymbolsRadioList"
import React, { Fragment, useState } from "react"
import { Typography, IconButton, FormControlLabel, Box } from "@mui/material"
import { z } from "zod"

import { Button, Card, CardActions, CardContent, CardHeader, Grid } from "@mui/material"
import { deleteUser } from "src/users/client"
import { ExportDreams } from "src/settings/components/ExportDreams"
import { FORM_RESET, FORM_ERROR } from "src/core/components/Form"
import { updateUser } from "src/users/client"
import { CheckboxField } from "src/core/components/CheckboxField"
import { ChangePassword } from "src/auth/validations"
import { changePassword } from "src/auth/client-mutations"
import { UseFormProps } from "react-hook-form"
import DeletionConfirmationDialog from "src/core/components/DeletionConfirmationDIalog"
import { deleteFolder } from "src/core/components/FileUpload/hooks"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

type FormType = "user" | "change-password" | "symbols" | "bedtime" | "advanced-charting"

export interface UpdateUserFormProps<S extends z.ZodType<any, any>> extends Partial<FormProps<S>> {
  initialValues: UseFormProps<z.infer<S>>["defaultValues"]
  onSuccess?: () => void
}

export function UpdateUserForm<S extends z.ZodType<any, any>>({
  onSuccess,
  ...props
}: UpdateUserFormProps<S>) {
  const router = useRouter()
  const [updateUserMutation, { isLoading: isUpdateUserLoading }] = useMutation(updateUser)
  const [changePasswordMutation, { isLoading: isChangePasswordLoading }] =
    useMutation(changePassword)
  const [deleteUserMutation] = useMutation(deleteUser)
  const [deleteDialogVisibility, setDeleteDialogVisibility] = useState(false)
  const [editForm, setEditForm] = useState<FormType | null>(null)

  async function onSubmit(values: z.TypeOf<S>, closeForm: () => void) {
    try {
      await updateUserMutation({ ...values })
      onSuccess?.()
      closeForm()
    } catch (error: any) {
      if (error.code === "P2002" && error.meta?.target?.includes("username")) {
        // This error comes from Prisma
        return { username: "This username is already being used" }
      } else {
        return { [FORM_ERROR]: error.toString() }
      }
    }
  }

  async function onDelete() {
    await deleteFolder()
    await deleteUserMutation()
    setDeleteDialogVisibility(false)
    router.push(Routes.Home())
  }

  function onClickEdit(newFormType: FormType | null, currentFormType: FormType | null) {
    if (currentFormType) {
      ;(document.getElementById(currentFormType) as HTMLFormElement).reset()
    }
    setEditForm(newFormType)
  }

  return (
    <Fragment>
      <Form<S>
        id="user"
        {...props}
        onSubmit={(values) => onSubmit(values, () => setEditForm(null))}
        onAfterReset={() => setEditForm(null)}
      >
        <Card
          className={`mb-3 transition-margin translate-x-0 translate-y-0 transform-gpu ${
            editForm !== "user" ? "bg-mui-secondary-light" : "-mx-4"
          }`}
        >
          <CardHeader title="Account" sx={{ paddingBottom: "0" }} component="h2" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <LabeledTextField name="email" label="email" disabled fullWidth />
              </Grid>

              <Grid item xs={12}>
                <LabeledTextField
                  name="username"
                  label="username"
                  placeholder="username"
                  inputLabelProps={{ shrink: true, disableAnimation: true }}
                  fullWidth
                  disabled={editForm !== "user"}
                  className="translate-x-0 translate-y-0 transform-gpu"
                />
              </Grid>
            </Grid>
          </CardContent>
          <CardActions
            className={`p-4 flex-column ${editForm === "user" ? "xsmax:block flex" : "flex"}`}
          >
            <Box
              className={`flex-row flex-wrap grow overflow-hidden ${
                editForm === "user" ? "xsmax:mb-4 mb-0" : "mb-0"
              }`}
            >
              <Button
                onClick={() => setDeleteDialogVisibility(true)}
                disabled={editForm !== "user"}
                className="mr-auto"
              >
                <span className="lucidicon-trash mr-2"></span> Delete account
              </Button>
            </Box>
            {editForm === "user" && (
              <Box className="flex flex-row ml-0">
                <Button type="reset" form="user" sx={{ ml: "auto" }} disabled={isUpdateUserLoading}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  form="user"
                  disabled={isUpdateUserLoading}
                  className={`w-auto transition-all ease-in-out duration-300 ${
                    isUpdateUserLoading ? "max-w-[113px]" : "max-w-[89px]"
                  }`}
                  endIcon={isUpdateUserLoading && <HourglassTopIcon className="opacity-50" />}
                >
                  Update
                </Button>
              </Box>
            )}
            {editForm !== "user" && (
              <IconButton
                color="primary"
                onClick={() => onClickEdit("user", editForm)}
                sx={{ ml: 2 }}
              >
                <span className="lucidicon-pencil"></span>
              </IconButton>
            )}
          </CardActions>
        </Card>
      </Form>

      <Form
        id="change-password"
        schema={ChangePassword}
        initialValues={{ currentPassword: "", password: "", passwordConfirmation: "" }}
        onSubmit={async (values) => {
          try {
            await changePasswordMutation(values)
            onSuccess?.()
            setEditForm(null)
            return { [FORM_RESET]: true }
          } catch (error: any) {
            if (error.name === "WrongCurrentPasswordError") {
              return { currentPassword: "Wrong Password" }
            }
            return { [FORM_ERROR]: error.toString() }
          }
        }}
        onAfterReset={() => setEditForm(null)}
      >
        <Card
          className={`mb-3 transition-margin translate-x-0 translate-y-0 transform-gpu ${
            editForm !== "change-password" ? "bg-mui-secondary-light" : "-mx-4"
          }`}
        >
          <CardHeader title="Change Password" sx={{ paddingBottom: "0" }} component="h2" />
          <CardContent>
            {editForm === "change-password" && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <LabeledTextField
                    name="currentPassword"
                    label="current password"
                    placeholder="current password"
                    type="password"
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="translate-x-0 translate-y-0 transform-gpu"
                  />
                </Grid>

                <Grid item xs={12}>
                  <LabeledTextField
                    name="password"
                    label="new password"
                    placeholder="new password"
                    type="password"
                    // className="rounded-top"
                    inputProps={{ sx: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } }}
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="translate-x-0 translate-y-0 transform-gpu"
                  />
                  <LabeledTextField
                    name="passwordConfirmation"
                    label="confirm new password"
                    placeholder="confirm new password"
                    type="password"
                    // className="rounded-bottom"
                    inputProps={{
                      sx: { borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: "-1px" },
                    }}
                    inputLabelProps={{ shrink: true, disableAnimation: true }}
                    fullWidth
                    className="translate-x-0 translate-y-0 transform-gpu"
                  />
                </Grid>
              </Grid>
            )}
          </CardContent>
          <CardActions sx={{ p: 2 }}>
            {editForm === "change-password" && (
              <Fragment>
                <Button
                  type="reset"
                  form="change-password"
                  sx={{ ml: "auto" }}
                  disabled={isChangePasswordLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  form="change-password"
                  disabled={isChangePasswordLoading}
                  className={`w-auto transition-all ease-in-out duration-300 ${
                    isChangePasswordLoading ? "max-w-[113px]" : "max-w-[89px]"
                  }`}
                  endIcon={isChangePasswordLoading && <HourglassTopIcon className="opacity-50" />}
                >
                  Update
                </Button>
              </Fragment>
            )}
            {editForm !== "change-password" && (
              <IconButton
                color="primary"
                onClick={() => onClickEdit("change-password", editForm)}
                sx={{ ml: "auto" }}
              >
                <span className="lucidicon-pencil"></span>
              </IconButton>
            )}
          </CardActions>
        </Card>
      </Form>

      <Form<S>
        id="symbols"
        {...props}
        onSubmit={(values) => onSubmit(values, () => setEditForm(null))}
        onAfterReset={() => setEditForm(null)}
      >
        <Card
          className={`mb-3 transition-all ${
            editForm !== "symbols" ? "bg-mui-secondary-light" : "-mx-4 px-4"
          }`}
        >
          <CardHeader
            title="Predefined symbols"
            sx={{ paddingBottom: "0" }}
            component="h2"
            className={`${editForm !== "symbols" ? "" : "-mx-4"}`}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <SymbolsRadioList isDisabled={editForm !== "symbols"} />
              </Grid>
            </Grid>
          </CardContent>
          <CardActions
            sx={{ display: { xs: "block", sm: "flex" } }}
            className={`p-4 flex-column transition-all ${editForm !== "symbols" ? "" : "px-0"}`}
          >
            <Typography
              variant="body1"
              sx={{ mb: { xs: "1rem", sm: "0" } }}
              className={`text-black ${editForm !== "symbols" ? "opacity-40" : "opacity-60"}`}
            >
              <small>
                1 - most icons used in dreamingsheep are from{" "}
                <Link href="https://thenounproject.com/">thenounproject.com</Link>
              </small>
            </Typography>
            {editForm === "symbols" && (
              <Box className="flex flex-row ml-auto">
                <Button
                  type="reset"
                  form="symbols"
                  sx={{ ml: "auto" }}
                  disabled={isUpdateUserLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  form="symbols"
                  disabled={isUpdateUserLoading}
                  className={`w-auto transition-all ease-in-out duration-300 ${
                    isUpdateUserLoading ? "max-w-[113px]" : "max-w-[89px]"
                  }`}
                  endIcon={isUpdateUserLoading && <HourglassTopIcon className="opacity-50" />}
                >
                  Update
                </Button>
              </Box>
            )}
            {editForm !== "symbols" && (
              <Box className="flex flex-row ml-auto">
                <IconButton
                  color="primary"
                  onClick={() => onClickEdit("symbols", editForm)}
                  className="ml-auto"
                >
                  <span className="lucidicon-pencil"></span>
                </IconButton>
              </Box>
            )}
          </CardActions>
        </Card>
      </Form>

      <Form<S>
        id="bedtime"
        {...props}
        onSubmit={(values) => onSubmit(values, () => setEditForm(null))}
        onAfterReset={() => setEditForm(null)}
      >
        <Card
          className={`mb-3 transition-margin translate-x-0 translate-y-0 transform-gpu ${
            editForm !== "bedtime" ? "bg-mui-secondary-light" : "-mx-4"
          }`}
        >
          <CardHeader title="Bedtime/Wake-up time" sx={{ paddingBottom: "0" }} component="h2" />
          <CardContent>
            <FormControlLabel
              disabled={editForm !== "bedtime"}
              control={<CheckboxField name="trackSleepingTime" />}
              label="Opt-in for bedtime/wake-up time for a sleep chart on the Stats page (the future-feature has arrived)."
            />
          </CardContent>
          <CardActions sx={{ p: 2 }}>
            {editForm === "bedtime" && (
              <Fragment>
                <Button
                  type="reset"
                  form="bedtime"
                  sx={{ ml: "auto" }}
                  disabled={isUpdateUserLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  form="bedtime"
                  disabled={isUpdateUserLoading}
                  className={`w-auto transition-all ease-in-out duration-300 ${
                    isUpdateUserLoading ? "max-w-[113px]" : "max-w-[89px]"
                  }`}
                  endIcon={isUpdateUserLoading && <HourglassTopIcon className="opacity-50" />}
                >
                  Update
                </Button>
              </Fragment>
            )}
            {editForm !== "bedtime" && (
              <IconButton
                color="primary"
                onClick={() => onClickEdit("bedtime", editForm)}
                sx={{ ml: "auto" }}
              >
                <span className="lucidicon-pencil"></span>
              </IconButton>
            )}
          </CardActions>
        </Card>
      </Form>

      <Form<S>
        id="advanced-charting"
        {...props}
        onSubmit={(values) => onSubmit(values, () => setEditForm(null))}
        onAfterReset={() => setEditForm(null)}
      >
        <Card
          className={`mb-3 transition-margin translate-x-0 translate-y-0 transform-gpu ${
            editForm !== "advanced-charting" ? "bg-mui-secondary-light" : "-mx-4"
          }`}
        >
          <CardHeader title="Advanced charting" sx={{ paddingBottom: "0" }} component="h2" />
          <CardContent>
            <FormControlLabel
              disabled={editForm !== "advanced-charting"}
              control={<CheckboxField name="advancedCharting" />}
              label="Opt-in for advanced charting on the Stats page (interactive charts)."
            />
          </CardContent>
          <CardActions sx={{ p: 2 }}>
            {editForm === "advanced-charting" && (
              <Fragment>
                <Button
                  type="reset"
                  form="advanced-charting"
                  sx={{ ml: "auto" }}
                  disabled={isUpdateUserLoading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  variant="contained"
                  type="submit"
                  form="advanced-charting"
                  disabled={isUpdateUserLoading}
                  className={`w-auto transition-all ease-in-out duration-300 ${
                    isUpdateUserLoading ? "max-w-[113px]" : "max-w-[89px]"
                  }`}
                  endIcon={isUpdateUserLoading && <HourglassTopIcon className="opacity-50" />}
                >
                  Update
                </Button>
              </Fragment>
            )}
            {editForm !== "advanced-charting" && (
              <IconButton
                color="primary"
                onClick={() => onClickEdit("advanced-charting", editForm)}
                sx={{ ml: "auto" }}
              >
                <span className="lucidicon-pencil"></span>
              </IconButton>
            )}
          </CardActions>
        </Card>
      </Form>

      <Card className="bg-mui-secondary-light">
        <CardHeader title="Your data" sx={{ paddingBottom: "0" }} component="h2" />
        <CardContent>
          <ExportDreams></ExportDreams>
        </CardContent>
      </Card>

      <DeletionConfirmationDialog
        open={deleteDialogVisibility}
        title="Delete account"
        message="This action will delete your account with all your dreams and symbols. You would have
        to sign up again if you decide to do so. Are you sure?"
        onCancel={() => setDeleteDialogVisibility(false)}
        onDelete={onDelete}
        deleteButton="Yes, Delete Account"
      />
    </Fragment>
  )
}
