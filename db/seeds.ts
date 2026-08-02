import seedCustomSymbols from "./utils/seedCustomSymbols"
import seedDefaultDreams from "./utils/seedDefaultDreams"
import seedDefaultUsers from "./utils/seedDefaultUsers"
import seedSystemSymbols from "./utils/seedSystemSymbols"

/*
 * This seed function is executed when you run `npm run db:seed`.
 *
 * Probably you want to use a library like https://chancejs.com
 * or https://github.com/Marak/Faker.js to easily generate
 * realistic data.
 */
const seed = async () => {
  await seedSystemSymbols()

  await seedDefaultUsers()

  await seedCustomSymbols()

  await seedDefaultDreams()
}

export default seed
