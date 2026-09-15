import { TRIAGE_TREE, TRIAGE_ROOT, type TriageNode } from './tree'

export * from './tree'

const BY_ID = new Map<string, TriageNode>(TRIAGE_TREE.map((node) => [node.id, node]))

/**
 * The node a URL is asking for, or the root.
 *
 * `q` comes straight off the query string, so it is attacker-controlled and is
 * looked up rather than trusted: an id that is not in the tree falls back to the
 * root instead of rendering nothing. A visitor who edits the URL gets the first
 * question, which is the right answer to "I do not know what you mean".
 */
export function triageNode(q: string | undefined): TriageNode {
  if (!q) return BY_ID.get(TRIAGE_ROOT)!
  return BY_ID.get(q) ?? BY_ID.get(TRIAGE_ROOT)!
}

/**
 * The question whose answer led here, so the page can offer "رجوع".
 *
 * Computed from the tree rather than carried in the URL. Keeping the path in the
 * query string would put a record of somebody's answers into their history, into
 * the `Referer` header on the way out, and into any screenshot they send —
 * which for health answers is exactly what rule 3 in `tree.ts` forbids. A single
 * node id says where they are and nothing about how they got there.
 *
 * A node reachable from two places reports the first parent in tree order. That
 * is a cosmetic choice about which question "رجوع" returns to, not a correctness
 * one — both are real routes to this node.
 */
export function triageParent(id: string): string | null {
  for (const node of TRIAGE_TREE) {
    if (node.kind !== 'question') continue
    if (node.answers.some((answer) => answer.next === id)) return node.id
  }
  return null
}

/**
 * The treatments a result carries, as the case form's query parameter.
 *
 * Comma-separated slugs, and nothing else ever goes in here — no free text, no
 * node id, no record of the route taken. What crosses into the form is exactly
 * what the patient would have ticked by hand.
 */
export function triageHandoff(node: TriageNode): string | null {
  if (node.kind !== 'result' || node.treatments.length === 0) return null
  return node.treatments.join(',')
}

/** Parses the form's `?t=` back into slugs, keeping only ones that exist. */
export function parseHandoff(
  value: string | undefined,
  known: readonly { id: string }[],
): string[] {
  if (!value) return []
  const ids = new Set(known.map((k) => k.id))
  return value
    .split(',')
    .map((slug) => slug.trim())
    .filter((slug) => ids.has(slug))
}

/** Every node id the tree can actually reach from the root. */
export function reachableIds(): Set<string> {
  const seen = new Set<string>()
  const queue = [TRIAGE_ROOT]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const node = BY_ID.get(id)
    if (node?.kind === 'question') for (const a of node.answers) queue.push(a.next)
  }
  return seen
}
