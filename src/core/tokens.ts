import { createHash, randomBytes } from "crypto"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// Random url-safe token. Format-compatible enough with Blitz's generateToken:
// tokens are ephemeral secrets, only their hash256 lands in the DB.
export function generateToken(numberOfCharacters = 32): string {
  const bytes = randomBytes(numberOfCharacters * 2)
  let out = ""
  for (let i = 0; i < bytes.length && out.length < numberOfCharacters; i++) {
    const b = bytes[i]! & 63
    if (b < ALPHABET.length) out += ALPHABET[b]
  }
  while (out.length < numberOfCharacters) out += ALPHABET[randomBytes(1)[0]! % ALPHABET.length]
  return out
}

// MUST stay sha256-hex — existing Token rows store hash256(token) values
export function hash256(input = ""): string {
  return createHash("sha256").update(input).digest("hex")
}
