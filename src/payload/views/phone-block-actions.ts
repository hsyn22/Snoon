'use server'

import { headers as nextHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { liftPhoneBlock } from '@/db/queries/phone-blocks'

/**
 * Lifting a phone cooldown.
 *
 * Reached only from the admin view, and the caller is still never trusted: a
 * server action is a public endpoint, and being rendered inside the admin proves
 * nothing about who calls it. Without this check anyone could clear the block
 * that stops a case being resubmitted against someone else's number.
 */
export async function liftPhoneBlockAction(blockId: string): Promise<void> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await nextHeaders() })

  if (!user || user.collection !== 'admins') throw new Error('Not authorised.')

  await liftPhoneBlock(blockId, String(user.email))
  revalidatePath('/admin/cases')
}
