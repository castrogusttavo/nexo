import {
  emailOTPClient,
  inferAdditionalFields,
  twoFactorClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Mirror the server-side `user.additionalFields` declaration so
// `authClient.signUp.email(...)` typechecks the consent timestamps. The
// server hook in `auth.ts` overwrites these with the server clock.
const consentFieldsSchema = {
  user: {
    acceptedTermsAt: { type: 'date', required: false },
    acceptedPrivacyAt: { type: 'date', required: false },
  },
} as const

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    emailOTPClient(),
    twoFactorClient(),
    inferAdditionalFields(consentFieldsSchema),
  ],
})
