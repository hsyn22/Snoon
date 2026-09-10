'use server'

import { headers as nextHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { decideStuckContact, type AdminContactDecision } from '@/lib/cases/contact'

/**
 * Deciding a case the patient never answered on.
 *
 * The caller is never trusted: a server action is a public endpoint, and being
 * rendered inside the admin proves nothing about who calls it. Without this,
 * anyone could advance a case to CONTACTED — which is the one thing the whole
 * patient-confirmation design exists to prevent.
 */
export async function decideStuckContactAction(
  caseId: string,
  decision: AdminContactDecision,
): Promise<void> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await nextHeaders() })

  if (!user || user.collection !== 'admins') throw new Error('Not authorised.')

  await decideStuckContact(caseId, decision, String(user.email))
  revalidatePath('/admin/cases')
}
