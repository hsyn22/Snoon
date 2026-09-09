import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { cases, claims } from '@/db/schema'

/**
 * Whether this case is waiting on the patient to confirm contact.
 *
 * True only when a student has actually reported reaching them and the case has
 * not moved on. Showing the question earlier would ask the patient to confirm
 * something nobody has claimed happened.
 */
export async function hasPendingContactAssertion(caseId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: claims.id })
    .from(claims)
    .innerJoin(cases, eq(cases.id, claims.caseId))
    .where(
      and(
        eq(claims.caseId, caseId),
        eq(claims.status, 'ACTIVE'),
        isNotNull(claims.contactAssertedAt),
        eq(cases.status, 'MATCHED'),
      ),
    )
    .limit(1)

  return Boolean(row)
}
