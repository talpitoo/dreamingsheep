// Blitz-compatible error classes: same `name` strings and status codes, so the
// RootErrorFallback branches and API error responses behave exactly as before.

export class AuthenticationError extends Error {
  name = "AuthenticationError"
  statusCode = 401
  constructor(message = "You must be logged in to access this") {
    super(message)
  }
}

export class AuthorizationError extends Error {
  name = "AuthorizationError"
  statusCode = 403
  constructor(message = "You are not authorized to access this") {
    super(message)
  }
}

export class NotFoundError extends Error {
  name = "NotFoundError"
  statusCode = 404
  constructor(message = "This could not be found") {
    super(message)
  }
}

export class CSRFTokenMismatchError extends Error {
  name = "CSRFTokenMismatchError"
  statusCode = 401
  constructor(message = "CSRF token mismatch") {
    super(message)
  }
}

const KNOWN = { AuthenticationError, AuthorizationError, NotFoundError, CSRFTokenMismatchError }

export interface ErrorPayload {
  name: string
  message: string
  statusCode: number
}

export function serializeError(e: unknown): ErrorPayload {
  if (e instanceof Error) {
    const statusCode = (e as { statusCode?: number }).statusCode ?? 500
    return { name: e.name || "Error", message: e.message, statusCode }
  }
  return { name: "Error", message: String(e), statusCode: 500 }
}

export function deserializeError(p: Partial<ErrorPayload> | undefined): Error {
  const name = p?.name ?? "Error"
  const message = p?.message ?? "Unknown error"
  const Known = KNOWN[name as keyof typeof KNOWN]
  if (Known) return new Known(message)
  const e = new Error(message)
  e.name = name
  ;(e as { statusCode?: number }).statusCode = p?.statusCode
  return e
}
