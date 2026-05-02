import { createContext, Dispatch, FC, SetStateAction, useContext, useState } from "react"

interface CreateInstantSymbolCtx {
  dialogOpen: boolean
  toggleDialog: Dispatch<SetStateAction<boolean>>
  closeDialog: () => void
  values: { name: string; description: string; code: string }
  setValues: (values: { name: string; description: string; code: string }) => void
  state: [((...event: any[]) => void) | undefined, Dispatch<SetStateAction<any>>]
}

const CreateInstantSymbolContext = createContext<CreateInstantSymbolCtx | null>(null)

const CreateInstantSymbolProvider: FC<{
  children: React.ReactNode
}> = (props) => {
  const [values, setValues] = useState({ name: "", description: "", code: "" })
  const [dialogOpen, toggleDialog] = useState(false)
  const state = useState(undefined)

  const closeDialog = () => {
    setValues({ name: "", description: "", code: "" })
    toggleDialog(false)
    state[1](undefined)
  }

  return (
    <CreateInstantSymbolContext.Provider
      value={{
        values,
        setValues,
        dialogOpen,
        toggleDialog,
        closeDialog,
        state,
      }}
    >
      {props.children}
    </CreateInstantSymbolContext.Provider>
  )
}

export default CreateInstantSymbolProvider

export const useInstantDreamDialog = () => {
  const context = useContext(CreateInstantSymbolContext)

  if (!context) {
    throw new Error("No CreateInstantSymbolProvider implementation")
  }

  return context
}
