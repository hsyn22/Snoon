/**
 * "Continue with Google", and whether it is available at all.
 *
 * Same shape as `isEmailConfigured` and `isTelegramConfigured`: the feature
 * registers itself only when its credentials are present, so a deployment that
 * has not set them up gets a site without the button rather than a button that
 * fails. سنون has to be runnable by someone who has configured none of the three.
 *
 * Why this matters more here than it looks:
 *
 * Student sign-up is currently blocked in production. Password sign-up needs a
 * verification email, email needs Resend, and Resend will only deliver to
 * arbitrary addresses once a sending domain is verified — so registration waits
 * on a domain nobody has bought yet. Google sign-in does not: Google has already
 * verified the address, so there is no message to send and nothing to wait for.
 * It is the one change that opens registration without a domain.
 *
 * What it is NOT is a shortcut past verification. A Google account proves
 * somebody owns a Gmail address; it says nothing about whether they are a fourth
 * year at a dental college. The enrolment document and an admin's decision are
 * untouched, and a student who signs in with Google still sees no case until an
 * admin approves them. The seconds saved are at the account step, which was
 * never the hard part — the hard part is the document, and this leaves more of a
 * student's patience for it.
 *
 * Reads `process.env` directly and is deliberately NOT marked `server-only`: the
 * tests exercise it by setting the variables, and a `server-only` guard makes a
 * module unloadable from plain Node. It must never be imported by a Client
 * Component — the values would inline as undefined in the browser bundle and the
 * button would silently vanish.
 */

export type GoogleCredentials = { clientId: string; clientSecret: string }

/**
 * Both halves or neither. A client id with no secret cannot complete the
 * exchange, and a secret with no id is a deployment that believes it is
 * configured — the same trap `isEmailConfigured` exists to close.
 */
export function googleCredentials(): GoogleCredentials | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function isGoogleConfigured(): boolean {
  return googleCredentials() !== null
}

/** The subset of Google's id-token claims سنون actually reads. */
export type GoogleProfile = {
  name: string
  email: string
  email_verified: boolean
  /** Present, and deliberately unused. See `mapProfileToUser` below. */
  picture?: string
}

/** What is kept on the local user row from a Google profile. */
export type MappedGoogleUser = {
  name: string
  email: string
  emailVerified: boolean
}

/**
 * Everything kept from a Google profile, and nothing else.
 *
 * Google returns a link to the user's profile photograph and Better Auth would
 * store it on the user row by default. سنون has no use for it — the product
 * shows no faces anywhere, deliberately — and data minimisation says a field
 * needs a reason rather than an opportunity. Dropped here, at the boundary,
 * rather than collected and ignored.
 *
 * `emailVerified` is read from Google's claim rather than assumed. Google can
 * return an account whose address it has not verified, and marking such a user
 * verified would walk them past a gate password sign-up enforces.
 *
 * Nothing here may ever set an academic status. Whether somebody may see a
 * patient is `snoon.students.verification_status`, which an admin sets after
 * reading an enrolment document — a Google account proves somebody owns a Gmail
 * address and says nothing about whether they are a dental student.
 */
export function mapGoogleProfile(profile: GoogleProfile): MappedGoogleUser {
  return {
    name: profile.name,
    email: profile.email,
    emailVerified: profile.email_verified,
  }
}

/**
 * The `socialProviders` block for Better Auth, or `undefined` when سنون has no
 * credentials — in which case no provider is registered and the button is never
 * rendered. A provider registered with an undefined secret would show a student
 * a button that fails at Google's own screen, which is worse than one that is
 * simply absent.
 *
 * Lives here rather than in `auth.ts` so it can be tested without loading the
 * database, which `auth.ts` pulls in through the Drizzle adapter.
 */
export function googleProvider(credentials: GoogleCredentials | null) {
  if (!credentials) return undefined
  return {
    google: {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      mapProfileToUser: mapGoogleProfile,
    },
  }
}
