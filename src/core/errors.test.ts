import { describe, expect, it } from "vitest"
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  CSRFTokenMismatchError,
  serializeError,
  deserializeError,
} from "./errors"

describe("error classes", () => {
  it("carry Blitz-compatible names and status codes", () => {
    expect(new AuthenticationError().name).toBe("AuthenticationError")
    expect(new AuthenticationError().statusCode).toBe(401)
    expect(new AuthorizationError().name).toBe("AuthorizationError")
    expect(new AuthorizationError().statusCode).toBe(403)
    expect(new NotFoundError().name).toBe("NotFoundError")
    expect(new NotFoundError().statusCode).toBe(404)
    expect(new CSRFTokenMismatchError().statusCode).toBe(401)
  })

  it("round-trips known classes through serialize/deserialize", () => {
    const e = deserializeError(serializeError(new AuthorizationError()))
    expect(e).toBeInstanceOf(AuthorizationError)
    expect((e as AuthorizationError).statusCode).toBe(403)
  })

  it("preserves name and message of unknown error classes", () => {
    class TooManyRequestsError extends Error {
      name = "TooManyRequestsError"
      message = "please wait an hour"
    }
    const wire = serializeError(new TooManyRequestsError())
    expect(wire).toEqual({
      name: "TooManyRequestsError",
      message: "please wait an hour",
      statusCode: 500,
    })
    const back = deserializeError(wire)
    expect(back.name).toBe("TooManyRequestsError")
    expect(back.message).toBe("please wait an hour")
    expect(back.toString()).toBe("TooManyRequestsError: please wait an hour")
  })

  it("serializes non-Error throwables safely", () => {
    expect(serializeError("boom")).toEqual({ name: "Error", message: "boom", statusCode: 500 })
  })
})
