import db from "db"

const CODE_SIZE_IN_DIGITS = 6

function generateCode(): string {
  let code = ""
  for (let i = 0; i < CODE_SIZE_IN_DIGITS; i++) {
    code += Math.floor(Math.random() * 10)
  }
  return code
}

export async function createOtp(userId: number): Promise<string> {
  const code = generateCode()
  const exists = !!(await db.otp.findFirst({ where: { userId } }))

  if (exists) {
    await db.otp.update({ where: { userId }, data: { code } })
  } else {
    await db.otp.create({
      data: { userId, code, createdAt: new Date() },
    })
  }

  return code
}
