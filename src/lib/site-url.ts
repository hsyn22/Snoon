/**
 * The site's own public address.
 *
 * Lifted out of `auth.ts` because the Telegram bot needs it too, and importing
 * `auth.ts` to get it would drag in Better Auth and its `BETTER_AUTH_SECRET`
 * check — which throws, and would take the bot down on a deployment where only
 * the messaging half is configured.
 *
 * It is what links sent to somebody else are built from, so it must be the
 * address they will actually open rather than the host a request arrived on.
 */
export function siteUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL

  // Set by Vercel. The project production URL is stable across deployments;
  // VERCEL_URL changes every push and would break a link sent yesterday.
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost}`

  return 'http://localhost:3000'
}
