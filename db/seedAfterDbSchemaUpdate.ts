import seedPredefinedSymbols from "./utils/seedPredefinedSymbols"

/*
 * WARNING: execute with `blitz db seed --file=db/seedAfterDbSchemaUpdate.ts`
 *
 * This is required after the DB schema update on production.
 * This 'selects' all predefined symbols on the /settings
 * page for all users. https://blitzjs.com/docs/cli-db
 */
const seedAfterDbSchemaUpdate = async () => {
  await seedPredefinedSymbols()
}

export default seedAfterDbSchemaUpdate
