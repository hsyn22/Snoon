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
    if (node.kind === 'question' && node.answers.some((a) => a.next === id)) return node.id
    if (node.kind === 'screen' && (node.pass === id || node.fail === id)) return node.id
  }
  return null
}

/** Where a node's own children live, whatever kind it is. */
export function childrenOf(node: TriageNode): readonly string[] {
  if (node.kind === 'question') return node.answers.map((a) => a.next)
  if (node.kind === 'screen') return [node.pass, node.fail]
  return []
}

/**
 * Which node an emergency screen's submission leads to.
 *
 * The screen is a plain GET form, so what comes back is whatever the browser
 * put in the query string: nothing at all, one value, or a list. **Any tick at
 * all fails the screen** — the items are not weighed against each other and
 * there is no threshold, because every one of them is on its own a reason to
 * be in a hospital rather than in a queue.
 *
 * The values themselves are never read. Only whether there are any. Which
 * symptoms somebody ticked is health information about them, and the tree's
 * third rule is that none of it is stored or carried anywhere — so the form
 * submits the *count*, not the answers, and even that is discarded the moment
 * the next node is chosen.
 */
export function screenOutcome(
  node: Extract<TriageNode, { kind: 'screen' }>,
  ticked: string | string[] | undefined,
): string {
  const any = Array.isArray(ticked) ? ticked.length > 0 : Boolean(ticked)
  return any ? node.fail : node.pass
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
    if (node) for (const child of childrenOf(node)) queue.push(child)
  }
  return seen
}
