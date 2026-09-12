import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/db'
import { account, session, user, verification } from '@/db/auth-schema'
import { sendEmail } from '@/lib/email'
import { googleCredentials, googleProvider } from '@/lib/oauth'

/**
 * Student authentication.
 *
 * Two ways in, and both are for students only. Patients never get an account:
 * friction there costs the people this exists to serve, and nothing below may
 * ever be offered on the patient side.
 *
 * 1. Email and password, with verification by link.
 * 2. "Continue with Google", when the deployment has credentials for it.
 *
 * No SMS and no OTP anywhere — they cost money per message and are excluded
 * across the project. Google OAuth is not an exception to that: it costs
 * nothing, and it replaces a message rather than sending one.
 *
 * Logging in is not the same as being allowed to see cases. Better Auth answers
 * "who is this?"; `snoon.students.verification_status` answers "may they see a
 * patient?", and that is re-read from the database on every case query. A valid
 * session never implies a verified student.
 */

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local.`)
  return value
}

/**
 * The site's own public URL. Verification links are built from it, so it must be
 * the address a student will actually open — not the per-deployment hostname if a
 * stable one exists.
 *
 * It is also what Google's redirect URI is built from — `<baseURL>/api/auth/
 * callback/google` — rather than the host a request arrived on. So the URI
 * registered in Google Cloud must match this value exactly, port included. A
 * mismatch is refused at Google's own screen with `redirect_uri_mismatch`,
 * before anything reaches سنون, so nothing is logged here to explain it.
 */
function resolveBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL

  // Set by Vercel. The project production URL is stable across deployments;
  // VERCEL_URL changes every push and would break a link sent yesterday.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost}`

  return 'http://localhost:3000'
}

const baseURL = resolveBaseUrl()

export const auth = betterAuth({
  secret: requiredEnv('BETTER_AUTH_SECRET'),
  baseURL,

  // Server actions post from the site's own origin; naming it explicitly keeps
  // Better Auth's origin check from rejecting them behind Vercel's proxy.
  trustedOrigins: [baseURL],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),

  /**
   * Registered only when credentials exist, so a deployment without them gets a
   * site with no Google button rather than one that errors on tap.
   *
   * The profile mapper is the data-minimisation rule doing its job. Google hands
   * back a link to the user's profile photograph and Better Auth would store it
   * on the user row by default. سنون has no use for it — the product
   * deliberately shows no faces anywhere — so it is dropped at the boundary
   * rather than collected and ignored. `emailVerified` is taken from Google's
   * own claim, which is the whole point: there is no message to send.
   *
   * Account linking is left at Better Auth's defaults on purpose. Its
   * `requireLocalEmailVerified` default means an attacker who pre-registers an
   * unverified password account at someone's address cannot have that person's
   * Google identity linked into the attacker's row on first sign-in. Do not
   * relax it.
   */
  socialProviders: googleProvider(googleCredentials()),

  emailAndPassword: {
    enabled: true,
    // A student cannot reach the case queue on an unverified address.
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: recipient, url }) => {
      await sendEmail({
        to: recipient.email,
        subject: 'تفعيل حسابك في سنون',
        text: [
          'أهلاً بيك،',
          '',
          'افتح هذا الرابط حتى تفعّل حسابك في سنون:',
          url,
          '',
          'إذا ما أنت اللي سجّلت، تجاهل هذي الرسالة.',
        ].join('\n'),
      })
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  // Lets server actions set the session cookie. Must stay last in the array.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
