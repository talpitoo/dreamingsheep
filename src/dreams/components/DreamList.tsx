import Link from "next/link"
import { useMutation } from "@blitzjs/rpc"
import { useRouter } from "next/router"
import { Routes } from "@blitzjs/next"
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  Pagination,
  Paper,
  Typography,
} from "@mui/material"
import classnames from "src/utils/classnames"
import { Dream, DreamTime, DreamType, RecallTime, Symbol } from "db"
import { Fragment, useEffect, useRef, useState } from "react"
import { DreamForm, FORM_ERROR } from "./DreamForm"
import updateDream from "src/dreams/mutations/updateDream"
import deleteDream from "src/dreams/mutations/deleteDream"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import {
  getClassnameByTime,
  getClassnameByMood,
  getClassnameByRecall,
  getClassnameByType,
} from "src/core/helpers/icons"
import DeletionConfirmationDialog from "src/core/components/DeletionConfirmationDIalog"
import { DateTime } from "luxon"
import HourglassTopIcon from "@mui/icons-material/HourglassTop"

export interface DreamItemFooterProps {
  time?: DreamTime
  mood?: number
  recall?: RecallTime
  type?: DreamType
  symbols?: Symbol[]
}

export const DreamItemFooter = ({
  time,
  mood,
  recall,
  type,
  symbols = [],
}: DreamItemFooterProps) => {
  return (
    <Fragment>
      {time && (
        <span className={classnames(getClassnameByTime(time), "text-gray-400 text-xl ml-2 mr-3")} />
      )}
      {mood && (
        <span className={classnames(getClassnameByMood(mood), "text-gray-400 text-xl mr-3")} />
      )}
      {recall && (
        <span className={classnames(getClassnameByRecall(recall), "text-gray-400 text-xl mr-3")} />
      )}
      {type && (
        <span className={classnames(getClassnameByType(type), "text-gray-400 text-xl mr-3")} />
      )}
      {symbols.length > 0 && <span className="lucidicon-tags text-gray-400 text-xl mr-3"></span>}

      {symbols.map((symbol, index) => (
        <Fragment key={symbol.id}>
          <Box className="inline-block">
            <Link href={Routes.SymbolsPage({ id: symbol.id })}>{symbol.name}</Link>
            {index < symbols.length - 1 ? <Fragment>,&nbsp;</Fragment> : ""}
          </Box>
        </Fragment>
      ))}
    </Fragment>
  )
}

interface DreamItemProps {
  dream: Dream & {
    symbols: Symbol[]
  }
  onAfterUpdate: () => void
  edit?: boolean
  onChangeEdit?: (dreamId: number | null) => void
}

const DreamItem = ({ dream, onAfterUpdate, edit, onChangeEdit }: DreamItemProps) => {
  const router = useRouter()
  const dreamRef = useRef<null | HTMLDivElement>(null)
  const isDreamPage = Routes.DreamsPage().pathname === router.pathname
  const [formValues, setFormValues] = useState<any>(dream)
  const [isEdit, setEdit] = useState(false)
  const [updateDreamMutation, { isLoading: isUpdateDreamLoading }] = useMutation(updateDream)
  const [deleteDreamMutation, { isLoading: isDeleteDreamLoading }] = useMutation(deleteDream)
  const [deleteDialogVisibility, setDeleteDialogVisibility] = useState(false)

  function changeEdit(e: boolean) {
    setFormValues(dream)
    onChangeEdit?.(e ? dream.id : null)
    setEdit(e)
  }

  useEffect(() => {
    const id = Number(router.query.id) || undefined
    if (id && id === dream.id) {
      changeEdit(true)
      dreamRef?.current?.scrollIntoView({ behavior: "smooth" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dream.id, router.query.id])

  useEffect(() => {
    if (edit !== undefined) {
      setEdit(edit)
    }
  }, [edit])

  return (
    <Fragment key={dream.id}>
      <Grid item ref={dreamRef} xs={12}>
        <Card
          className={`transition-margin translate-x-0 translate-y-0 transform-gpu ${
            !isEdit ? "bg-mui-secondary-light" : "-mx-4"
          }`}
        >
          {!isEdit && true && (
            <>
              <CardHeader
                title={
                  isDreamPage ? (
                    <div className="text-2xl">
                      {dream.favorite && (
                        <span className="lucidicon lucidicon-star-full text-xl leading-none align-baseline mr-2 text-gray-400"></span>
                      )}
                      {dream.title}
                    </div>
                  ) : (
                    <Link
                      href={Routes.DreamsPage({
                        date: DateTime.fromJSDate(dream.dreamAt).toFormat("yyyy-MM-dd"),
                        id: dream.id,
                      })}
                    >
                      {dream.favorite && (
                        <span className="lucidicon lucidicon-star-full text-xl leading-none align-baseline mr-2 text-gray-400"></span>
                      )}
                      {dream.title}
                    </Link>
                  )
                }
                className="pb-0"
                component="h2"
              />
              <CardHeader
                subheader={isDreamPage ? null : dream.dreamAt.toDateString()}
                className="py-0"
              />
            </>
          )}
          {!isEdit && false && (
            <CardHeader title={dream.title} sx={{ paddingBottom: "0" }} component="h2" />
          )}
          {!isEdit && (
            <CardContent>
              <Typography
                variant="body1"
                className={isDreamPage ? "pre-wrap" : "pre-wrap line-clamp"}
              >
                {dream.description}
              </Typography>
            </CardContent>
          )}
          {isEdit && (
            <CardContent>
              <DreamForm
                id={"update-dream_" + dream.id}
                initialValues={dream}
                onSubmit={async (values) => {
                  try {
                    await updateDreamMutation({
                      id: dream.id,
                      ...values,
                    })
                    onAfterUpdate()
                    changeEdit(false)
                  } catch (error: any) {
                    return {
                      [FORM_ERROR]: error.toString(),
                    }
                  }
                }}
                onValuesChange={(values) => setFormValues(values)}
              />
            </CardContent>
          )}
          <CardActions className="p-4 flex-column" sx={{ display: { xs: "block", sm: "flex" } }}>
            <Box
              className="flex-row flex-wrap grow overflow-hidden"
              sx={{ mb: { xs: "1rem", sm: "0" } }}
            >
              {!isEdit ? (
                <DreamItemFooter
                  time={dream.time}
                  mood={dream.mood}
                  recall={dream.recall}
                  type={dream.type}
                  symbols={dream.symbols}
                />
              ) : (
                <DreamItemFooter
                  time={formValues?.time}
                  mood={formValues?.mood}
                  recall={formValues?.recall}
                  type={formValues?.type}
                  symbols={formValues?.symbols}
                />
              )}
            </Box>
            <Box className="flex flex-row ml-0">
              <IconButton
                color="primary"
                sx={{ mr: "auto", ml: { xs: 0, md: 2 } }}
                onClick={() => setDeleteDialogVisibility(true)}
              >
                <span className="lucidicon-trash"></span>
              </IconButton>
              {isEdit && (
                <Fragment>
                  <Button onClick={() => changeEdit(false)} disabled={isUpdateDreamLoading}>
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    variant="contained"
                    type="submit"
                    form={"update-dream_" + dream.id}
                    sx={{ ml: 2 }}
                    disabled={isUpdateDreamLoading}
                    className={`w-auto transition-all ease-in-out duration-300 ${
                      isUpdateDreamLoading ? "max-w-[113px]" : "max-w-[89px]"
                    }`}
                    endIcon={isUpdateDreamLoading && <HourglassTopIcon className="opacity-50" />}
                  >
                    Update
                  </Button>
                </Fragment>
              )}
              {!isEdit && (
                <IconButton color="primary" onClick={() => changeEdit(true)} sx={{ ml: 2 }}>
                  <span className="lucidicon-pencil"></span>
                </IconButton>
              )}
            </Box>
          </CardActions>
        </Card>
      </Grid>
      <DeletionConfirmationDialog
        open={deleteDialogVisibility}
        title="Delete dream?"
        message={
          <>
            Are you sure you want to delete <strong>{dream.title}</strong>?
          </>
        }
        onCancel={() => setDeleteDialogVisibility(false)}
        onDelete={async () => {
          await deleteDreamMutation({ id: dream.id })
          onAfterUpdate()
          setDeleteDialogVisibility(false)
        }}
        isDeleteLoading={isDeleteDreamLoading}
      />
    </Fragment>
  )
}

export interface DreamListProps {
  isLoading: boolean
  dreams: (Dream & {
    symbols: Symbol[]
  })[]
  count: number
  refetchList: () => void
  page?: number
  itemPerPage?: number
  onPageChange?: (_, page: number) => void
  noDreamMessage: string
}

export const DreamList = ({
  isLoading,
  dreams,
  count,
  refetchList,
  page,
  itemPerPage,
  onPageChange,
  noDreamMessage,
}: DreamListProps) => {
  const [editDreamId, setEditDreamId] = useState<number | null>(null)
  return (
    <Fragment>
      {isLoading && (
        <Box sx={{ height: "100%" }}>
          <LoadingSpiral />
        </Box>
      )}
      {count === 0 && !isLoading && (
        <Fragment>
          <Paper className="bg-mui-secondary-light">
            <Box sx={{ p: 2 }}>
              <Typography variant="body1" gutterBottom className="mb-0">
                {noDreamMessage}
              </Typography>
            </Box>
          </Paper>
        </Fragment>
      )}
      {count > 0 && !isLoading && (
        <Fragment>
          <Grid container spacing={{ xs: 4 }} rowSpacing={{ xs: 2 }} sx={{ mt: 2, mb: 2 }}>
            {dreams.map((dream) => (
              <DreamItem
                key={dream.id}
                dream={dream}
                onAfterUpdate={refetchList}
                edit={editDreamId === dream.id}
                onChangeEdit={(dreamId) => setEditDreamId(dreamId)}
              />
            ))}
          </Grid>
          {page !== undefined && itemPerPage !== undefined && onPageChange !== undefined && (
            <Paper className="inline-block">
              <Pagination
                count={Math.ceil(count / itemPerPage)}
                page={page}
                color="primary"
                onChange={onPageChange}
                shape="rounded"
              />
            </Paper>
          )}
        </Fragment>
      )}
    </Fragment>
  )
}

export default DreamList
