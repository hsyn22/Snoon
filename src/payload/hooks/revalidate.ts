import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Refresh the pages that render Payload-managed configuration.
 *
 * Without this, the patient form is a pre-rendered page: adding a city in the
 * admin changes nothing a patient can see until its revalidation window elapses
 * *and* someone requests it again. An admin who adds a city and then checks the
 * form would reasonably conclude the admin is broken.
 *
 * The time-based `revalidate` on the page stays as the safety net for changes
 * made outside the admin (a direct database edit, a restore); this hook is what
 * makes an admin edit appear at once.
 */
const CONFIG_DEPENDENT_PATHS = ['/case/new']

function revalidateConfigPages(): void {
  for (const path of CONFIG_DEPENDENT_PATHS) revalidatePath(path)
}

export const revalidateOnChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateConfigPages()
  return doc
}

export const revalidateOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateConfigPages()
  return doc
}
