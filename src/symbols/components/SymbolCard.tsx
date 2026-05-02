import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/router"
import { useMutation } from "@blitzjs/rpc"
import { Routes } from "@blitzjs/next"
import { SymbolWithUsage } from "src/symbols/queries/getSymbolsWithUsage"
import classnames from "src/utils/classnames"
import { Fragment, useEffect, useRef, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  Typography,
} from "@mui/material"
// import IconWithUsage from "../../core/components/IconWithUsage"
import updateSymbol from "src/symbols/mutations/updateSymbol"
import { FORM_ERROR, SymbolForm } from "./SymbolForm"
import { UpdateSymbol } from "../validations"
import DeletionConfirmationDialog from "src/core/components/DeletionConfirmationDIalog"
import deleteSymbol from "src/symbols/mutations/deleteSymbol"
import { DateTime } from "luxon"
import { loader } from "src/utils/loader"
import { deleteFile, uploadFile } from "src/core/components/FileUpload/hooks"
import { Config } from "src/config"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

interface SymbolCardProps {
  symbol: SymbolWithUsage
  onAfterUpdate: () => void
  edit?: boolean
  onChangeEdit?: (symbolId: number | null) => void
}

const SymbolCard = (props: SymbolCardProps) => {
  const router = useRouter()
  const symbolRef = useRef<null | HTMLDivElement>(null)
  const { symbol, onAfterUpdate, edit, onChangeEdit } = props
  const [isEdit, setEdit] = useState(false)
  const [updateSymbolMutation, { isLoading: isUpdateSymbolLoading }] = useMutation(updateSymbol)
  const [deleteSymbolMutation] = useMutation(deleteSymbol)
  const [deleteDialogVisibility, setDeleteDialogVisibility] = useState(false)
  const [pictureFile, setPictureFile] = useState<File | null | undefined>(null)

  function changeEdit(e: boolean) {
    onChangeEdit?.(e ? symbol.id : null)
    setEdit(e)
  }

  useEffect(() => {
    const id = Number(router.query.id) || undefined
    if (id && id === symbol.id) {
      changeEdit(true)
      symbolRef?.current?.scrollIntoView({ behavior: "smooth" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol.id, router.query.id])

  useEffect(() => {
    if (edit !== undefined) {
      setEdit(edit)
    }
  }, [edit])

  return (
    <Fragment>
      <Card
        ref={symbolRef}
        className={`mb-3 transition-margin translate-x-0 translate-y-0 transform-gpu ${
          !isEdit ? "bg-mui-secondary-light" : "-mx-4"
        }`}
      >
        <CardHeader
          disableTypography={true}
          avatar={
            symbol.icon ? (
              <span className={classnames(symbol.icon, "text-2xl")} />
            ) : (
              <span className="lucidicon lucidicon-tag text-2xl"></span>
            )
          }
          action={
            <Typography
              variant="body1"
              sx={{ fontSize: "1.875rem", marginRight: "0.5rem" }}
              className="text-gray-400"
            >
              {Number(symbol.occurrences)}
            </Typography>
          }
          title={symbol.name}
          sx={{ paddingBottom: "0" }}
          className="text-2xl"
        />
        {isEdit && (
          <CardContent>
            <Box>
              <SymbolForm
                id={"update-symbol_" + symbol.id}
                builtInSymbol={symbol.builtIn}
                schema={UpdateSymbol}
                initialValues={symbol}
                onSubmit={async (values) => {
                  try {
                    await updateSymbolMutation(values)
                    onAfterUpdate()
                    changeEdit(false)
                  } catch (error: any) {
                    return {
                      [FORM_ERROR]: error.toString(),
                    }
                  }
                }}
                onAfterUpdate={onAfterUpdate}
              />

              <Typography variant="body1" sx={{ mt: 2 }}>
                {Number(symbol.occurrences)}{" "}
                {symbol.occurrences === 1 ? "occurrence" : "occurrences"}
              </Typography>
              <List>
                {symbol.dreams
                  .map((dream) => (
                    <ListItem key={dream.id} className="p-0 inline">
                      <Link
                        href={Routes.DreamsPage({
                          date: DateTime.fromJSDate(dream.dreamAt).toFormat("yyyy-MM-dd"),
                          id: dream.id,
                        })}
                      >
                        {dream.title}
                      </Link>
                    </ListItem>
                  ))
                  .reduce((arr, el, index, collection) => {
                    return [...arr, el, ...(index < collection.length - 1 ? [", "] : [])]
                  }, [])}
              </List>
            </Box>
          </CardContent>
        )}
        <CardActions
          className={`p-4 flex-column ${isEdit ? "pt-0" : ""}`}
          sx={{
            ...(isEdit && {
              display: { xs: "block", sm: "flex" },
            }),
            ...(!isEdit && {
              display: "flex",
            }),
          }}
        >
          <Box
            className={`flex-row flex-wrap grow text-gray-400 overflow-hidden truncate ${
              isEdit ? "opacity-0" : ""
            }`}
          >
            {/* NOTE: icons disabled <IconWithUsage type="time" countInfo={symbol.timeInfo} />
            <IconWithUsage type="mood" countInfo={symbol.moodInfo} />
            <IconWithUsage type="recall" countInfo={symbol.recallInfo} />
            <IconWithUsage type="type" countInfo={symbol.typeInfo} /> */}
            {symbol.description}
          </Box>
          <Box className="flex flex-row ml-0">
            {!symbol.builtIn && (
              <IconButton
                color="primary"
                sx={{ mr: "auto", ml: { xs: 0, md: 2 } }}
                onClick={() => setDeleteDialogVisibility(true)}
              >
                <span className="lucidicon-trash"></span>
              </IconButton>
            )}
            {!isEdit && (
              <IconButton color="primary" onClick={() => changeEdit(true)} sx={{ ml: 2 }}>
                <span className="lucidicon-pencil"></span>
              </IconButton>
            )}
            {isEdit && (
              <Fragment>
                <Button onClick={() => changeEdit(false)} disabled={isUpdateSymbolLoading}>
                  Cancel
                </Button>
                {!symbol.builtIn && (
                  <Button
                    color="primary"
                    variant="contained"
                    type="submit"
                    form={"update-symbol_" + symbol.id}
                    sx={{ ml: 2 }}
                    disabled={isUpdateSymbolLoading}
                    className={`w-auto transition-all ease-in-out duration-300 ${
                      isUpdateSymbolLoading ? "max-w-[113px]" : "max-w-[89px]"
                    }`}
                    endIcon={isUpdateSymbolLoading && <HourglassTopIcon className="opacity-50" />}
                  >
                    Update
                  </Button>
                )}
              </Fragment>
            )}
          </Box>
        </CardActions>
      </Card>
      <DeletionConfirmationDialog
        open={deleteDialogVisibility}
        title="Delete symbol?"
        message={
          <>
            Are you sure you want to delete <strong>{symbol.name}</strong>? It will remove the
            symbol from it&apos;s related dreams too
          </>
        }
        onCancel={() => setDeleteDialogVisibility(false)}
        onDelete={async () => {
          await deleteSymbolMutation({ id: symbol.id })
          if (!!symbol.picture) {
            await deleteFile(symbol.picture)
          }
          onAfterUpdate()
          setDeleteDialogVisibility(false)
        }}
      />
    </Fragment>
  )
}

export default SymbolCard
