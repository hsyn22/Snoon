import { and, count, desc, eq, gt, gte, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { cases, phoneBlocks } from '@/db/schema'

/**
 * The guard on a phone number, and the only place that decides whether a number
 * may submit a case.
 *
 * The problem it exists for: patients have no account, so nothing stops someone
 * entering another person's number, and the first that person hears of it is a
 * dental student ringing about treatment they never asked for. Proving ownership
 * of a number costs money per message and needs the SMS this project excludes,
 * so ownership is not proven. Instead the damage is capped before the call and
 * stopped in one tap after it.
 *
 * Counts only. Nothing here returns a phone number or a case belonging to one —
 * the caller already holds the number it is asking about.
 */

/** Case states where a student may still ring the patient. */
const OPEN_STATUSES = [
  'REQUESTED',
  'MATCHED',
  'CONTACTED',
  'APPOINTMENT_CONFIRMED',
  'NO_CONTACT',
  'RETURNED_TO_QUEUE',
] as const

export type PhoneSubmissionVerdict =
  | { ok: true }
  /** Someone reported that this number's owner never asked for treatment. */
  | { ok: false; reason: 'BLOCKED'; until: Date }
  | { ok: false; reason: 'TOO_MANY_OPEN' }
  | { ok: false; reason: 'TOO_MANY_TODAY' }

/** The live block on a number, if there is one. */
export async function activePhoneBlock(phone: string): Promise<{ until: Date } | null> {
  const [row] = await db
    .select({ until: phoneBlocks.blockedUntil })
    .from(phoneBlocks)
    .where(
      and(
        eq(phoneBlocks.phone, phone),
        isNull(phoneBlocks.liftedAt),
        gt(phoneBlocks.blockedUntil, new Date()),
      ),
    )
    .orderBy(desc(phoneBlocks.blockedUntil))
    .limit(1)

  return row ? { until: row.until } : null
}

/**
 * Whether this number may submit another case.
 *
 * Checked in this order deliberately: a blocked number is told it is blocked
 * even if it would also have hit a cap, because that is the message that
 * explains itself and names a way out.
 */
export async function checkPhoneMaySubmit(
  phone: string,
  limits: { maxOpen: number; maxPerDay: number },
): Promise<PhoneSubmissionVerdict> {
  const block = await activePhoneBlock(phone)
  if (block) return { ok: false, reason: 'BLOCKED', until: block.until }

  const [open] = await db
    .select({ total: count() })
    .from(cases)
    .where(and(eq(cases.patientPhone, phone), inArray(cases.status, [...OPEN_STATUSES])))

  if (Number(open?.total ?? 0) >= limits.maxOpen) return { ok: false, reason: 'TOO_MANY_OPEN' }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [today] = await db
    .select({ total: count() })
    .from(cases)
    .where(and(eq(cases.patientPhone, phone), gte(cases.createdAt, dayAgo)))

  if (Number(today?.total ?? 0) >= limits.maxPerDay) return { ok: false, reason: 'TOO_MANY_TODAY' }

  return { ok: true }
}

/**
 * Put a number beyond use for a while.
 *
 * Called when a student reports that the person they rang never asked for
 * treatment. Extending an existing block rather than stacking a second one keeps
 * "when does this lift" answerable by looking at one row.
 */
export async function blockPhone(input: {
  phone: string
  reason: string
  caseId?: string
  days: number
}): Promise<void> {
  const until = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000)

  const existing = await activePhoneBlock(input.phone)
  if (existing) {
    await db
      .update(phoneBlocks)
      .set({ blockedUntil: until, reason: input.reason })
      .where(
        and(
          eq(phoneBlocks.phone, input.phone),
          isNull(phoneBlocks.liftedAt),
          gt(phoneBlocks.blockedUntil, new Date()),
        ),
      )
    return
  }

  await db.insert(phoneBlocks).values({
    phone: input.phone,
    reason: input.reason,
    caseId: input.caseId ?? null,
    blockedUntil: until,
  })
}

export type PhoneBlockRow = {
  id: string
  phone: string
  reason: string
  caseId: string | null
  blockedUntil: Date
  createdAt: Date
}

/** For the admin. The number is the point of the row, so it is returned. */
export async function listActivePhoneBlocks(limit = 50): Promise<PhoneBlockRow[]> {
  return db
    .select({
      id: phoneBlocks.id,
      phone: phoneBlocks.phone,
      reason: phoneBlocks.reason,
      caseId: phoneBlocks.caseId,
      blockedUntil: phoneBlocks.blockedUntil,
      createdAt: phoneBlocks.createdAt,
    })
    .from(phoneBlocks)
    .where(and(isNull(phoneBlocks.liftedAt), gt(phoneBlocks.blockedUntil, new Date())))
    .orderBy(desc(phoneBlocks.createdAt))
    .limit(limit)
}

/** An admin decides the block was wrong, or the real owner got in touch. */
export async function liftPhoneBlock(blockId: string, liftedBy: string): Promise<boolean> {
  const lifted = await db
    .update(phoneBlocks)
    .set({ liftedAt: new Date(), liftedBy })
    .where(and(eq(phoneBlocks.id, blockId), isNull(phoneBlocks.liftedAt)))
    .returning({ id: phoneBlocks.id })

  return lifted.length > 0
}

/** Used by the tests to assert a number really is out of use. */
export async function countActiveBlocks(phone: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(phoneBlocks)
    .where(
      and(
        eq(phoneBlocks.phone, phone),
        isNull(phoneBlocks.liftedAt),
        gt(phoneBlocks.blockedUntil, sql`now()`),
      ),
    )
  return Number(row?.total ?? 0)
}
