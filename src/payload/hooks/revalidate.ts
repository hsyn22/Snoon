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
  try {
    for (const path of CONFIG_DEPENDENT_PATHS) revalidatePath(path)
  } catch {
    // Payload does not only run inside Next. The seed script, migrations and any
    // CLI task create documents with no request context, and revalidatePath
    // throws an invariant there. Nothing is being served in those cases, so
    // there is no page cache to refresh and nothing to report — but letting it
    // propagate would fail the seed, and with it any deploy that seeds.
  }
}

export const revalidateOnChange: CollectionAfterChangeHook = ({ doc }) => {
  revalidateConfigPages()
  return doc
}

export const revalidateOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  revalidateConfigPages()
  return doc
}
