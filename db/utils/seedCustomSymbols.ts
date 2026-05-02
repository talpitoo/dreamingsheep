import db from "db"

/**
 * Seeds demo user's custom symbols
 */
export default async function seedCustomSymbols() {
  const demoUser = await db.user.findFirst({
    where: {
      role: "DEMO",
    },
  })

  if (!demoUser) return Promise.reject("No demo user configured, please seed users first")

  await db.symbol.createMany({
    data: [
      {
        icon: "lucidicon-tag",
        name: "debate",
        description: "debate",
        code: "debate",
        builtIn: false,
        authorId: demoUser.id,
      },
      {
        icon: "lucidicon-tag",
        name: "philosophy",
        description: "philosophy",
        code: "philosophy",
        builtIn: false,
        authorId: demoUser.id,
      },
      {
        icon: "lucidicon-tag",
        name: "dao",
        description: "dao",
        code: "dao",
        builtIn: false,
        authorId: demoUser.id,
      },
    ],
  })

  const symbolsToConnect = await db.symbol.findMany({
    where: {
      OR: [
        { code: "debate" },
        { code: "philosophy" },
        { code: "dao" },
        // Add more custom symbols as needed
      ],
    },
  })

  await db.user.update({
    where: { id: demoUser.id },
    data: {
      relatedSymbols: {
        connect: symbolsToConnect.map((symbol) => ({ id: symbol.id })),
      },
    },
  })
}
