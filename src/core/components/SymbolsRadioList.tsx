import Link from "next/link"
import { useQuery } from "@blitzjs/rpc"
import {
  Typography,
  FormLabel,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Box,
} from "@mui/material"
import classnames from "src/utils/classnames"
import { Symbol } from "db"
import { Fragment, useEffect, useRef, useState } from "react"
import { useFormContext } from "react-hook-form"
import LoadingSpiral from "src/core/components/LoadingSpiral"
import getSymbols from "src/symbols/queries/getSymbols"
import getSymbolsWithoutDreams from "src/symbols/queries/getSymbolsWithoutDreams"
import { useElementSize } from "usehooks-ts"

interface SymbolsRadioListProps {
  isDisabled: boolean
}

export const SymbolsRadioList = (props: SymbolsRadioListProps) => {
  const { isDisabled } = props
  const [symbols, { isLoading }] = useQuery(
    getSymbolsWithoutDreams,
    {
      where: { builtIn: true },
      orderBy: { id: "asc" },
    },
    {
      refetchOnWindowFocus: false,
    }
  )

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext()

  const error: string = Array.isArray(errors.relatedSymbols)
    ? errors.relatedSymbols.join(", ")
    : (errors.relatedSymbols?.message as string) || (errors.relatedSymbols as unknown as string)

  const [selectedSymbols, setSelectedSymbols] = useState<Symbol[]>([])
  const [selectAllChecked, setSelectAllChecked] = useState(false)
  const symbolsRef = useRef<Symbol[] | null>(null)

  const [ToggleButtonGroupRef, { width, height }] = useElementSize()

  symbolsRef.current = watch("relatedSymbols")

  useEffect(() => {
    register("relatedSymbols")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // NOTE: this is ChatGPT's solution for https://gitlab.com/talpitoo/dreamingsheep/-/issues/110
    if (symbolsRef.current) {
      const syms = symbols.filter((sym) =>
        symbolsRef.current?.some((symRef) => sym.id === symRef.id)
      )
      setSelectedSymbols(syms)
      setSelectAllChecked(symbols.length === syms.length)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [symbols])

  return (
    <Fragment>
      <FormLabel disabled={isDisabled} className={`${isDisabled ? "" : "block -mx-4"}`}>
        Pick predefined symbols (themes, characters, setting, etc.) to be used ouf of the box, or
        opt-out completely by deselecting all¹.
      </FormLabel>
      {isLoading && (
        <Box sx={{ height: "100%" }}>
          <LoadingSpiral />
        </Box>
      )}
      <Box className={`${isDisabled ? "" : "-mx-4"}`}>
        <FormControlLabel
          control={
            <Checkbox
              disabled={isDisabled}
              checked={selectAllChecked}
              onChange={(_, checked) => {
                setSelectAllChecked(checked)
                if (checked) {
                  setSelectedSymbols(symbols)
                  setValue("relatedSymbols", symbols)
                } else {
                  setSelectedSymbols([])
                  setValue("relatedSymbols", [])
                }
              }}
            />
          }
          label="Select all"
        />
      </Box>
      {/* NOTE: the calculation magic below is for offsetting the .-mx-4 while preserving the aspect ratio of the buttons */}
      <Box
        sx={{
          ...(!isDisabled && {
            transformOrigin: "top center",
            transform: `scale(${width / (width - 32)})`,
            willChange: "transfrom",
            mb: `${height * (width / (width - 32)) - height}px`,
            // mx: 2,
          }),
        }}
        className="flex flex-wrap rounded-md shadow bg-white overflow-hidden transition-transform"
      >
        <ToggleButtonGroup
          ref={ToggleButtonGroupRef}
          className="flex-wrap"
          value={selectedSymbols}
          exclusive={false}
          color="primary"
          onChange={(_, value) => {
            setSelectedSymbols(value)
            setValue("relatedSymbols", value)
            setSelectAllChecked(symbols.length === value?.length)
          }}
          disabled={isDisabled}
        >
          {symbols.map((sym) => (
            <ToggleButton key={sym.id} value={sym} className="grow">
              <span className="flex flex-col items-center justify-center">
                <span className={classnames(sym.icon, "mb-1 h-5 w-5 text-2xl")} />
                {sym.name}
              </span>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      {error && (
        <Typography variant="caption" sx={{ color: "red" }}>
          {error}
        </Typography>
      )}
    </Fragment>
  )
}

export default SymbolsRadioList
