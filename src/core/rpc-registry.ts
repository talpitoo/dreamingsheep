// EVERY file under src/**/{queries,mutations}/ is a public HTTP endpoint and must
// be registered here (guarded by rpc-registry.test.ts). Keys = filenames = URL:
// POST /api/rpc/<key>
import getDream from "src/dreams/queries/getDream"
import getDreams from "src/dreams/queries/getDreams"
import getDreamsByMonth from "src/dreams/queries/getDreamsByMonth"
import getDreamsGroupBy from "src/dreams/queries/getDreamsGroupBy"
import createDream from "src/dreams/mutations/createDream"
import updateDream from "src/dreams/mutations/updateDream"
import deleteDream from "src/dreams/mutations/deleteDream"
import getSymbol from "src/symbols/queries/getSymbol"
import getSymbols from "src/symbols/queries/getSymbols"
import getAutocompleteSymbols from "src/symbols/queries/getAutocompleteSymbols"
import getSymbolsWithoutDreams from "src/symbols/queries/getSymbolsWithoutDreams"
import getSymbolsWithUsage from "src/symbols/queries/getSymbolsWithUsage"
import createSymbol from "src/symbols/mutations/createSymbol"
import updateSymbol from "src/symbols/mutations/updateSymbol"
import deleteSymbol from "src/symbols/mutations/deleteSymbol"
import getCurrentUser from "src/users/queries/getCurrentUser"
import getUser from "src/users/queries/getUser"
import getUsers from "src/users/queries/getUsers"
import updateUser from "src/users/mutations/updateUser"
import deleteUser from "src/users/mutations/deleteUser"
import getSleepingTime from "src/sleepingTimes/queries/getSleepingTime"
import getSleepingTimes from "src/sleepingTimes/queries/getSleepingTimes"
import createSleepingTime from "src/sleepingTimes/mutations/createSleepingTime"
import updateSleepingTime from "src/sleepingTimes/mutations/updateSleepingTime"
import signup from "src/auth/mutations/signup"
import login from "src/auth/mutations/login"
import logout from "src/auth/mutations/logout"
import verifyUser from "src/auth/mutations/verifyUser"
import resendOtp from "src/auth/mutations/resendOtp"
import forgotPassword from "src/auth/mutations/forgotPassword"
import resetPassword from "src/auth/mutations/resetPassword"
import changePassword from "src/auth/mutations/changePassword"

export const rpcRegistry: Record<string, (input: any, ctx: any) => Promise<any>> = {
  getDream,
  getDreams,
  getDreamsByMonth,
  getDreamsGroupBy,
  createDream,
  updateDream,
  deleteDream,
  getSymbol,
  getSymbols,
  getAutocompleteSymbols,
  getSymbolsWithoutDreams,
  getSymbolsWithUsage,
  createSymbol,
  updateSymbol,
  deleteSymbol,
  getCurrentUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  getSleepingTime,
  getSleepingTimes,
  createSleepingTime,
  updateSleepingTime,
  signup,
  login,
  logout,
  verifyUser,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
}
