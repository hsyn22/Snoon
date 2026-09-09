import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { db } from '@/db'
import { account, session, user, verification } from '@/db/auth-schema'
import { sendEmail } from '@/lib/email'

/**
 * Student authentication.
 *
 * Email and password, with verification by link. No SMS and no OTP anywhere —
 * they cost money per message and are excluded across the project.
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

export const auth = betterAuth({
  secret: requiredEnv('BETTER_AUTH_SECRET'),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),

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
