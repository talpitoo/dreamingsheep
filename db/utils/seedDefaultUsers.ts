import { SecurePassword } from "src/auth/secure-password"
import db from "db"

/**
 * Seeds the platform's default users
 */
export default async function seedDefaultUsers() {
  const adminPwd = await SecurePassword.hash("Password_123")
  const userPwd = await SecurePassword.hash("Password_123")
  const demoPwd = await SecurePassword.hash("zhuangzi")

  const symbolsBuiltInForZhuangzi = await db.symbol.findMany({
    where: {
      OR: [
        { code: "false-memory" },
        { code: "inception" },
        { code: "spirit" },
        { code: "nature-outdoors" },
        { code: "sunny-clear" },
        { code: "friend-colleague" },
        { code: "love" },
        { code: "transcendental" },
      ],
    },
  })

  await db.user.create({
    data: {
      email: "meh@dreamingsheep.net",
      username: "meh",
      role: "ADMIN",
      hashedPassword: adminPwd,
      verified: true,
    },
  })

  await db.user.create({
    data: {
      email: "zhuangzi@dreamingsheep.net",
      username: "zhuangzi",
      role: "DEMO",
      hashedPassword: demoPwd,
      verified: true,
      relatedSymbols: {
        connect: symbolsBuiltInForZhuangzi.map((symbol) => ({ id: symbol.id })),
      },
    },
  })

  await db.user.create({
    data: {
      email: "dalecooper@dreamingsheep.net",
      username: "dalecooper",
      role: "USER",
      hashedPassword: userPwd,
      verified: true,
    },
  })
}
