import { secureCompare } from '@/lib/secure-compare'

/**
 * Authorising a scheduled-job request.
 *
 * Extracted from the route so it can be tested directly: this is the only thing
 * standing between a public URL and an endpoint that releases claims and expires
 * cases.
 *
 * Fails closed. An unset or implausibly short secret means "refuse everything",
 * never "allow everything" — a deployment that forgot the variable should have a
 * job that does not run, not an endpoint anyone can trigger.
 */
const MIN_SECRET_LENGTH = 16

export function isAuthorisedCronRequest(
  headers: { get: (name: string) => string | null },
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return false

  // Vercel cron sends `Authorization: Bearer <secret>`; any other scheduler can
  // send that or the plain header.
  const presented =
    headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? headers.get('x-cron-secret') ?? ''

  return secureCompare(presented, secret)
}
