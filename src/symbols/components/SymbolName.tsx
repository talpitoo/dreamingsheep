import { Fragment } from "react"

/**
 * A symbol's name, followed by 🖼️ when the user has attached an image to it.
 *
 * The marker is derived at render time from `picture`, never stored in `name`: an image can be
 * removed at any time, and a name that carried the emoji in the database would then lie (and would
 * show up in search, in the PDF export and in the URL slug). It is also decoration rather than
 * content, so it is `aria-hidden` — a screen reader reads "philosophy", not "philosophy framed
 * picture" — and the `title` gives a sighted mouse user the same information.
 */
export interface SymbolNameProps {
  symbol: { name: string; picture?: string | null }
}

export const SymbolName = ({ symbol }: SymbolNameProps) => (
  <Fragment>
    {symbol.name}
    {symbol.picture ? (
      <span aria-hidden="true" title="has an attached image">
        {" 🖼️"}
      </span>
    ) : null}
  </Fragment>
)

export default SymbolName
