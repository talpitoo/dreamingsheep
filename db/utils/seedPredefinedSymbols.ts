import db from "db"

export default async function seedPredefinedSymbols() {
  // Find all predefined symbols
  const predefinedSymbols = await db.symbol.findMany({
    where: { builtIn: true },
  })

  // Find all users
  const users = await db.user.findMany()

  // Create associations between users and predefined symbols
  for (const user of users) {
    await db.user.update({
      where: { id: user.id },
      data: { relatedSymbols: { connect: predefinedSymbols.map((symbol) => ({ id: symbol.id })) } },
    })
  }

  console.log("Predefined symbols seeded for all users.")
}
