// Visual replacement for Blitz/Next's ErrorComponent: big status code, divider,
// message — used by the RootErrorFallback branches in _app.
interface ErrorStatusProps {
  statusCode: number | string
  title: string
}

export function ErrorStatus({ statusCode, title }: ErrorStatusProps) {
  return (
    <div className="py-10 text-center">
      {/* The classic "404 | page not found" divider was asked for here (border-r border-current)
          but never drew: Tailwind v3 sets only a border WIDTH, and with Preflight disabled the
          style stayed `none`. v4's border utilities carry their own style, so the rule would light
          up — a change nobody asked for in a CSS migration. Dropped to keep the page pixel-identical;
          restoring the divider is a deliberate design choice, not a side effect (issue #1). */}
      <h1 className="align-middle inline-block mr-5 pr-5 text-2xl font-medium">{statusCode}</h1>
      <span className="align-middle text-base">{title}</span>
    </div>
  )
}
