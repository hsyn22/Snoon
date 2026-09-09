import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { telegramLinks } from '@/db/schema'
import { generateInviteToken, hashInviteToken } from '@/lib/telegram/invite-token'
import type { NotificationRecipient } from '@/lib/notifications'

/**
 * Data access for Telegram chat bindings.
 *
 * Invite tokens are stored hashed, so this file never sees a plaintext token
 * except the one it has just minted and is handing back to be put in a link.
 */

export type TelegramSubject = { type: 'PATIENT_CASE' | 'STUDENT'; id: string }

/**
 * Mint an invite for a subject, replacing any earlier unused one.
 *
 * Replacing rather than reusing means a link that was shared by accident stops
 * working the moment a new one is requested, and it keeps the one-active-link
 * index satisfied.
 */
export async function createInvite(subject: TelegramSubject): Promise<string> {
  const token = generateInviteToken()

  await db.transaction(async (tx) => {
    await tx
      .update(telegramLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(telegramLinks.subjectType, subject.type),
          eq(telegramLinks.subjectId, subject.id),
          isNull(telegramLinks.revokedAt),
        ),
      )

    await tx.insert(telegramLinks).values({
      subjectType: subject.type,
      subjectId: subject.id,
      inviteTokenHash: hashInviteToken(token),
    })
  })

  return token
}

export type LinkResult =
  | { ok: true; subject: TelegramSubject }
  | { ok: false; reason: 'UNKNOWN_TOKEN' | 'ALREADY_USED' }

/**
 * Bind a Telegram chat to whatever the invite token names.
 *
 * Single-use: an invite that already carries a chat id is refused rather than
 * re-pointed, so a forwarded link cannot move a patient's notifications to
 * someone else's chat.
 */
export async function linkChat(token: string, chatId: string): Promise<LinkResult> {
  const hash = hashInviteToken(token)

  const [row] = await db
    .select({
      id: telegramLinks.id,
      subjectType: telegramLinks.subjectType,
      subjectId: telegramLinks.subjectId,
      chatId: telegramLinks.chatId,
    })
    .from(telegramLinks)
    .where(and(eq(telegramLinks.inviteTokenHash, hash), isNull(telegramLinks.revokedAt)))
    .limit(1)

  if (!row) return { ok: false, reason: 'UNKNOWN_TOKEN' }
  if (row.chatId && row.chatId !== chatId) return { ok: false, reason: 'ALREADY_USED' }

  await db
    .update(telegramLinks)
    .set({ chatId, linkedAt: new Date() })
    .where(eq(telegramLinks.id, row.id))

  return { ok: true, subject: { type: row.subjectType, id: row.subjectId } }
}

/** The chat to notify for a recipient, or null if they never opted in. */
export async function getChatIdFor(recipient: NotificationRecipient): Promise<string | null> {
  const subjectId = recipient.kind === 'PATIENT_CASE' ? recipient.caseId : recipient.studentId

  const [row] = await db
    .select({ chatId: telegramLinks.chatId })
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.subjectType, recipient.kind),
        eq(telegramLinks.subjectId, subjectId),
        isNull(telegramLinks.revokedAt),
      ),
    )
    .limit(1)

  return row?.chatId ?? null
}

/** Stop notifying a chat. Kept as a revocation rather than a delete. */
export async function revokeLinksForChat(chatId: string): Promise<number> {
  const revoked = await db
    .update(telegramLinks)
    .set({ revokedAt: new Date() })
    .where(and(eq(telegramLinks.chatId, chatId), isNull(telegramLinks.revokedAt)))
    .returning({ id: telegramLinks.id })

  return revoked.length
}


/** Which subject a chat is bound to, if any. The chat id is the trusted identity. */
export async function getSubjectForChat(chatId: string): Promise<TelegramSubject | null> {
  const [row] = await db
    .select({ subjectType: telegramLinks.subjectType, subjectId: telegramLinks.subjectId })
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.chatId, chatId),
        isNull(telegramLinks.revokedAt),
      ),
    )
    .limit(1)

  return row ? { type: row.subjectType, id: row.subjectId } : null
}

/**
 * Whether a subject already has a chat bound, so a page can say so rather than
 * offering the link again.
 *
 * A plain query, deliberately not in a `'use server'` module. Exporting it from
 * one would compile it into a callable server action — a public endpoint taking
 * an id and answering a question about it — when all it is used for is rendering
 * a panel the caller is already authorised to see.
 */
export async function isSubjectLinked(subject: TelegramSubject): Promise<boolean> {
  const [row] = await db
    .select({ chatId: telegramLinks.chatId })
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.subjectType, subject.type),
        eq(telegramLinks.subjectId, subject.id),
        isNull(telegramLinks.revokedAt),
      ),
    )
    .limit(1)

  return Boolean(row?.chatId)
}
