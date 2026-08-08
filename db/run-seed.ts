import db from "./index"
import seed from "./seeds"

// Replacement for `blitz db seed`: runs the same default-exported seed function.
seed()
  .then(async () => {
    await db.$disconnect()
    console.log("Seeding done 🐏")
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
