import { PrismaClient } from "@prisma/client"

export * from "@prisma/client"

// hot-reload-safe singleton (replaces Blitz's enhancePrisma). Client bundles may
// import enums from this module (e.g. DreamType) — like enhancePrisma's browser
// stub, the client must never CONSTRUCT PrismaClient, only the server does.
const globalForPrisma = global as unknown as { prisma?: PrismaClient }
const prisma =
  typeof window === "undefined"
    ? globalForPrisma.prisma ?? new PrismaClient()
    : (null as unknown as PrismaClient)
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
