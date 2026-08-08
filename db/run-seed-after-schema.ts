import db from "./index"
import seedAfterDbSchemaUpdate from "./seedAfterDbSchemaUpdate"

// Replacement for `blitz db seed --file=db/seedAfterDbSchemaUpdate.ts` —
// the production-only one-off backfill runner (see db/CLAUDE.md).
seedAfterDbSchemaUpdate()
  .then(async () => {
    await db.$disconnect()
    console.log("Post-schema-update seeding done 🐏")
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
