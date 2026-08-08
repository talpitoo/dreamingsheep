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
import { SymbolsList } from "src/symbols/components/SymbolsList"
import { SymbolJumpAutocomplete } from "src/symbols/components/SymbolJumpAutocomplete"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

const SymbolsPage: BlitzPage = () => {
  const router = useRouter()
  const [createSymbolMutation, { isLoading: isCreateSymbolLoading }] = useMutation(createSymbol)
  const [showForm, setShowForm] = useState(false)
  const [customOnly, setCustomOnly] = useState(false)
  const user = useCurrentUser()

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
        <Grid item md={2} />
        <Grid item xs={12} sm={6} md={4}>
          <Box
            sx={{
              width: { xs: "50%", sm: "100%" },
              ...(user ? { margin: "auto" } : { margin: { xs: "0 auto -2rem", sm: "auto" } }),
            }}
          >
            <Image
              src={sheepSymbols}
              alt="symbols sheep"
              width={384}
              height={384}
              className="w-full h-auto"
            />
          </Box>
        </Grid>
      </Grid>

      <Grid container>
        <Grid item md={2} />
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
                      sx={{ ml: 2 }}
                      disabled={isCreateSymbolLoading}
                      className={`w-auto transition-all ease-in-out duration-300 ${
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
