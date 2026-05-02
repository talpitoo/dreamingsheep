import db from "db"

export default async function getSymbolsWithoutDreams({ where, orderBy }) {
  return await db.symbol.findMany({
    where: where,
    orderBy: orderBy,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      code: true,
      name: true,
      description: true,
      picture: true,
      icon: true,
      builtIn: true,
      authorId: true,
      // Exclude the 'dreams' relationship here
    },
  })
}
