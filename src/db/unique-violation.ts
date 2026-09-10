/**
 * Recognising a Postgres unique-constraint violation, through whatever wrapped it.
 *
 * Drizzle wraps driver errors, so `error.code` is not where the SQLSTATE lives —
 * it is on the `cause`, sometimes a cause or two down. A check that only looked
 * at the top-level error therefore never matched, which mattered more than it
 * sounds: the partial unique index on claims is the *second line of defence*
 * behind "a case can never be claimed twice", and the code catching it turned a
 * clean "this case is no longer available" into an unhandled 500.
 *
 * Walking the chain rather than reaching for `cause.code` directly, because how
 * many layers deep it sits is Drizzle's business and has changed before.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === 'object' &&
      current !== null &&
      'code' in current &&
      (current as { code?: unknown }).code === '23505'
    ) {
      return true
    }

    current = typeof current === 'object' && current !== null ? (current as { cause?: unknown }).cause : null
  }

  return false
}
