// Visual replacement for Blitz/Next's ErrorComponent: big status code, divider,
// message — used by the RootErrorFallback branches in _app.
interface ErrorStatusProps {
  statusCode: number | string
  title: string
}

export function ErrorStatus({ statusCode, title }: ErrorStatusProps) {
  return (
    <div className="py-10 text-center">
      <h1 className="align-middle inline-block mr-5 pr-5 text-2xl font-medium border-r border-current">
        {statusCode}
      </h1>
      <span className="align-middle text-base">{title}</span>
    </div>
  )
}
