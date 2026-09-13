import classnames from "src/utils/classnames"
import Image from "next/image"
import { useMutation } from "src/core/rpc-client"
import { useRouter } from "next/router"
import { AppPage as BlitzPage } from "src/core/types"
import { Routes } from "src/routes"
import { useCurrentUser } from "src/core/hooks/useCurrentUser"
import Layout from "src/core/layouts/Layout"
import React, { Suspense, useState } from "react"
import titleSymbols from "public/assets/title-symbols.png"
import sheepSymbols from "public/assets/sheep-symbols.png"
import { Button, Card, CardActions, CardContent, Container, Grid, Box } from "@mui/material"
import { FORM_ERROR, FORM_RESET, SymbolForm } from "src/symbols/components/SymbolForm"
import { CreateSymbol } from "src/symbols/validations"
import { createSymbol } from "src/symbols/client"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import SheepLink from "src/core/components/SheepLink"
import { SymbolsList } from "src/symbols/components/SymbolsList"
import { SymbolJumpAutocomplete } from "src/symbols/components/SymbolJumpAutocomplete"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

const SymbolsPage: BlitzPage = () => {
  const router = useRouter()
  const [createSymbolMutation, { isLoading: isCreateSymbolLoading }] = useMutation(createSymbol)
  const [showForm, setShowForm] = useState(false)
  const [customOnly, setCustomOnly] = useState(false)
  const user = useCurrentUser()

  // the sheep leads back to the start of the section — the first page, with any ?id= dropped.
  // `id` has to count too, not just the page: a deep link from a dream opens that symbol's card
  // for editing, and when the symbol happens to sit on page 1 the URL ends up ?id=N&page=1, so a
  // page-only test would leave the card open with no way back. Same reset the "custom only"
  // filter does below
  const sheepHref = router.query.id || Number(router.query.page) > 1 ? Routes.SymbolsPage() : null

  function goToLastPage() {
    router.push({ query: { refetch: "true" } })
  }

  function onCustomOnlyChange(checked: boolean) {
    setCustomOnly(checked)
    // the filter changes the page count — restart from page 1 (this also drops a stale ?id deep link)
    router.push({ query: {} })
  }

  return (
    <Container>
      <Grid container>
        <Grid item md={2} className="grid-spacer-md-2" />
        <Grid item xs={12} sm={6} md={4}>
          <Box
            className={classnames(
              "w-1/2 sm:w-full",
              user ? "m-auto" : "mt-0 mx-auto -mb-8 sm:m-auto"
            )}
          >
            <SheepLink href={sheepHref}>
              <Image
                src={sheepSymbols}
                alt="symbols sheep"
                width={384}
                height={384}
                className="w-full h-auto"
              />
            </SheepLink>
          </Box>
        </Grid>
      </Grid>

      <Grid container>
        <Grid item md={2} className="grid-spacer-md-2" />
        <Grid item xs={12} md={8}>
          <h1 className="heading">
            <Image src={titleSymbols} alt="Symbols" width="151" height="55" />
            <span className="sr-only">Symbols</span>
          </h1>
          {/* <Typography variant="h2" sx={{ color: "white" }} gutterBottom>
            {user?.role === Role.USER
              ? "My symbols"
              : "All symbols"}
          </Typography> */}
          <Suspense fallback={<LoadingSpiral />}>
            {/* quick jump — the list below is paginated, this finds a symbol directly */}
            <SymbolJumpAutocomplete
              customOnly={customOnly}
              onCustomOnlyChange={onCustomOnlyChange}
            />
            <SymbolsList customOnly={customOnly} />
          </Suspense>
          <p className="mt-6 text-right">
            <Button variant="contained" onClick={() => setShowForm(true)}>
              New symbol
            </Button>
          </p>
          {showForm && (
            <Grid className="mt-4">
              <Card className="-mx-4">
                <CardContent>
                  <SymbolForm
                    id="create-symbol"
                    schema={CreateSymbol}
                    initialValues={{
                      name: "",
                      code: "",
                      description: "",
                      picture: "",
                      icon: "",
                      builtIn: false,
                    }}
                    onSubmit={async (values) => {
                      try {
                        await createSymbolMutation(values)
                        setShowForm(false)
                        goToLastPage()
                        return { [FORM_RESET]: true }
                      } catch (error: any) {
                        return {
                          [FORM_ERROR]: error.toString(),
                        }
                      }
                    }}
                  />
                </CardContent>
                <CardActions className="p-4 flex flex-column">
                  <div className="grow" />
                  <div className="flex flex-row">
                    <Button onClick={() => setShowForm(false)} disabled={isCreateSymbolLoading}>
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      variant="contained"
                      type="submit"
                      form="create-symbol"
                      disabled={isCreateSymbolLoading}
                      className={`w-auto ml-4 transition-all ease-in-out duration-300 ${
                        isCreateSymbolLoading ? "max-w-[87px]" : "max-w-[64px]"
                      }`}
                      endIcon={isCreateSymbolLoading && <HourglassTopIcon className="opacity-50" />}
                    >
                      Add
                    </Button>
                  </div>
                </CardActions>
              </Card>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  )
}

SymbolsPage.authenticate = true
SymbolsPage.getLayout = (page) => <Layout title="Symbols">{page}</Layout>

export default SymbolsPage
