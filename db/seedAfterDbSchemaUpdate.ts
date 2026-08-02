import seedPredefinedSymbols from "./utils/seedPredefinedSymbols"

/*
 * WARNING: execute with `npm run db:seed:after-schema`
 *
 * This is required after the DB schema update on production.
 * This 'selects' all predefined symbols on the /settings
 * page for all users.
 */
const seedAfterDbSchemaUpdate = async () => {
  await seedPredefinedSymbols()
}

export default seedAfterDbSchemaUpdate
