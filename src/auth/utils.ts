import { generateToken, hash256 } from "src/core/tokens"
import { SecurePassword } from "src/auth/secure-password"
import { AuthenticationError, NotFoundError } from "src/core/errors"
import db, { User } from "db"

const VERIFY_USER_TOKEN_EXPIRATION_IN_HOURS = 24

export class UserSessionError extends Error {
  name = "UserSessionError"
  message = "User is not logged in or session has expired."
  constructor() {
    super()
  }
}

export class UserVerifiedError extends Error {
  name = "UserVerifiedError"
  message = "User is already verified"
  constructor() {
    super()
  }
}

export const authenticateUser = async (
  rawEmail: string,
  rawPassword: string
): Promise<Omit<User, "hashedPassword">> => {
  const email = rawEmail.toLowerCase().trim()
  const password = rawPassword.trim()

  const user = await db.user.findFirst({ where: { email } })
  if (!user) throw new AuthenticationError()

  const result = await SecurePassword.verify(user.hashedPassword, password)

  if (result === SecurePassword.VALID_NEEDS_REHASH) {
    // Upgrade hashed password with a more secure hash
    const improvedHash = await SecurePassword.hash(password)
    await db.user.update({ where: { id: user.id }, data: { hashedPassword: improvedHash } })
  }

  const { hashedPassword, ...rest } = user
  return rest
}

export const generateVerifyUserToken = async (userId: number): Promise<string> => {
  const user = await db.user.findFirst({ where: { id: userId } })

  const token = generateToken(32)
  const hashedToken = hash256(token)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + VERIFY_USER_TOKEN_EXPIRATION_IN_HOURS)

  if (user) {
    await db.token.deleteMany({ where: { type: "VERIFY_USER", userId: user.id } })

    await db.token.create({
      data: {
        user: { connect: { id: user.id } },
        type: "VERIFY_USER",
        expiresAt,
        hashedToken,
      },
    })
  }

  return hashedToken
}

export const validateVerifyUserToken = async (username?: string, token?: string): Promise<User> => {
  if (!username || !token) {
    throw new UserSessionError()
  }

  const user = await db.user.findFirst({ where: { username: username } })

  if (!user) throw new UserSessionError()

  const possibleToken = await db.token.findFirst({
    where: { userId: user.id, type: "VERIFY_USER", hashedToken: token },
  })

  if (!possibleToken) {
    throw new UserSessionError()
  }

  if (possibleToken.expiresAt < new Date()) {
    await db.token.deleteMany({ where: { type: "VERIFY_USER", userId: user.id } })
    throw new UserSessionError()
  }

  return user
}
