import type signupResolver from "src/auth/mutations/signup"
import type loginResolver from "src/auth/mutations/login"
import type logoutResolver from "src/auth/mutations/logout"
import type verifyUserResolver from "src/auth/mutations/verifyUser"
import type resendOtpResolver from "src/auth/mutations/resendOtp"
import type forgotPasswordResolver from "src/auth/mutations/forgotPassword"
import type resetPasswordResolver from "src/auth/mutations/resetPassword"
import type changePasswordResolver from "src/auth/mutations/changePassword"
import { rpcMutation } from "src/core/rpc-client"

export const signup = rpcMutation<typeof signupResolver>("signup")
export const login = rpcMutation<typeof loginResolver>("login")
export const logout = rpcMutation<typeof logoutResolver>("logout")
export const verifyUser = rpcMutation<typeof verifyUserResolver>("verifyUser")
export const resendOtp = rpcMutation<typeof resendOtpResolver>("resendOtp")
export const forgotPassword = rpcMutation<typeof forgotPasswordResolver>("forgotPassword")
export const resetPassword = rpcMutation<typeof resetPasswordResolver>("resetPassword")
export const changePassword = rpcMutation<typeof changePasswordResolver>("changePassword")
