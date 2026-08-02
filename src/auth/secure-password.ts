import SecurePasswordLib from "secure-password"
import { AuthenticationError } from "src/core/errors"

// Ported from @blitzjs/auth/secure-password (MIT) so existing argon2id hashes in
// User.hashedPassword keep verifying byte-for-byte. Hashes are stored base64.
const SP = () => new SecurePasswordLib()

export const SecurePassword = {
  ...SecurePasswordLib,
  VALID: SecurePasswordLib.VALID,
  VALID_NEEDS_REHASH: SecurePasswordLib.VALID_NEEDS_REHASH,
  INVALID: SecurePasswordLib.INVALID,
  INVALID_UNRECOGNIZED_HASH: SecurePasswordLib.INVALID_UNRECOGNIZED_HASH,
  HASH_BYTES: SecurePasswordLib.HASH_BYTES,

  async hash(password: string | null | undefined) {
    if (!password) throw new AuthenticationError()
    const hashedBuffer = await SP().hash(Buffer.from(password))
    return hashedBuffer.toString("base64")
  },

  async verify(hashedPassword: string | null | undefined, password: string | null | undefined) {
    if (!hashedPassword || !password) throw new AuthenticationError()
    try {
      const result = await SP().verify(Buffer.from(password), Buffer.from(hashedPassword, "base64"))
      if (result === SecurePasswordLib.VALID || result === SecurePasswordLib.VALID_NEEDS_REHASH) {
        return result
      }
      throw new AuthenticationError()
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new AuthenticationError()
    }
  },
}
