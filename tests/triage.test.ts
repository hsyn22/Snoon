import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  TRIAGE_TREE,
  TRIAGE_ROOT,
  parseHandoff,
  reachableIds,
  triageHandoff,
  triageNode,
  triageParent,
  childrenOf,
  screenOutcome,
} from '@/lib/triage'

/**
 * The tree is data, and data rots quietly: a renamed treatment slug, an answer
 * pointing at a node somebody deleted, or a question whose answers all lead
 * back into it would each produce a page that looks fine and traps a patient.
 * These are the checks that make editing the tree safe for somebody who is not
 * going to run the app.
 */

/**
 * The treatment slugs, read out of the seed file itself rather than copied.
 *
 * A copy would pass forever after somebody renamed a slug in Payload, and the
 * symptom of that is the quietest kind: the guide finishes, hands the form a
 * slug nothing matches, and the patient lands on a form with no boxes ticked
 * and no idea why. Reading the real file is what makes the check mean anything.
 */
const SEEDED = (() => {
  const source = readFileSync(new URL('../src/payload/seed.ts', import.meta.url), 'utf8')
  const body = source.match(/const TREATMENT_TYPES = \[([\s\S]*?)\n\]/)?.[1]
  if (!body) throw new Error('TREATMENT_TYPES not found in seed.ts — update this test')
  const slugs = [...body.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]!)
  if (slugs.length === 0) throw new Error('no slugs parsed from seed.ts — update this test')
  return slugs
})()

describe('the triage tree', () => {
  it('has a root', () => {
    expect(TRIAGE_TREE.some((n) => n.id === TRIAGE_ROOT)).toBe(true)
  })

  it('gives every node a unique id', () => {
    const ids = TRIAGE_TREE.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never points an answer at a node that does not exist', () => {
    const ids = new Set(TRIAGE_TREE.map((n) => n.id))
    for (const node of TRIAGE_TREE) {
      for (const child of childrenOf(node)) {
        expect(ids, `${node.id} → ${child}`).toContain(child)
      }
    }
  })

  /*
   * The structural reason the emergency screen exists. Before Haider's
   * correction the red flags were answers inside branches, so they were only
   * ever found by somebody who happened to pick the right branch first —
   * a person with a spreading facial infection who tapped "I have a missing
   * tooth" never saw the question at all.
   */
  it('screens for emergencies before it asks anything else', () => {
    const root = TRIAGE_TREE.find((n) => n.id === TRIAGE_ROOT)!
    expect(root.kind).toBe('screen')
    if (root.kind !== 'screen') return
    expect(root.items.length).toBeGreaterThan(0)
    // Ticking anything must land on a referral, never on a treatment.
    const failed = TRIAGE_TREE.find((n) => n.id === root.fail)!
    expect(failed.kind).toBe('referral')
  })

  it('asks the age question before it asks what is needed', () => {
    const root = TRIAGE_TREE.find((n) => n.id === TRIAGE_ROOT)!
    if (root.kind !== 'screen') throw new Error('root is not a screen')
    const age = TRIAGE_TREE.find((n) => n.id === root.pass)!
    expect(age.kind).toBe('question')
    if (age.kind !== 'question') return
    // Under fifteen enters the child's own branch rather than ending there:
    // Haider's follow-up is that a child says what they need too.
    const under = age.answers[0]!
    const child = TRIAGE_TREE.find((n) => n.id === under.next)!
    expect(child.kind).toBe('question')
  })

  /*
   * Every outcome a child can reach must carry `paediatric`. That slug is what
   * routes the case to paedodontics, and `listOpenCasesForStudent` treats it as
   * containment — so a child's case that lost it would not merely be
   * mislabelled, it would surface to every fourth year in the city, who must
   * not treat children at all.
   */
  it('never lets a child reach an outcome without `paediatric`', () => {
    const byId = new Map(TRIAGE_TREE.map((n) => [n.id, n]))
    const age = TRIAGE_TREE.find((n) => n.id === 'age')!
    if (age.kind !== 'question') throw new Error('age is not a question')
    const seen = new Set<string>()
    const walk = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      const node = byId.get(id)
      if (!node) return
      if (node.kind === 'result') {
        expect(node.treatments, `${node.id} is reachable by a child`).toContain('paediatric')
        return
      }
      for (const next of childrenOf(node)) walk(next)
    }
    walk(age.answers[0]!.next)
    // And the branch really does go somewhere, rather than passing vacuously.
    expect(seen.size).toBeGreaterThan(3)
  })

  it('offers fluoride to children, and only through the child branch', () => {
    const withFluoride = TRIAGE_TREE.filter(
      (n) => n.kind === 'result' && n.treatments.includes('fluoride'),
    )
    expect(withFluoride.length).toBeGreaterThan(0)
    for (const node of withFluoride) {
      if (node.kind !== 'result') continue
      expect(node.treatments, node.id).toContain('paediatric')
    }
  })

  it('asks a child whether the tooth is a milk tooth, and allows "not sure"', () => {
    const tooth = TRIAGE_TREE.find((n) => n.id === 'child-tooth')!
    expect(tooth.kind).toBe('question')
    if (tooth.kind !== 'question') return
    expect(tooth.answers.length).toBe(3)
    // A parent guessing to get past a form is worse than one saying so.
    expect(tooth.answers.some((a) => a.label.includes('ما متأكد'))).toBe(true)
  })

  it('fails the screen on any tick at all, and reads no value', () => {
    const root = TRIAGE_TREE.find((n) => n.id === TRIAGE_ROOT)!
    if (root.kind !== 'screen') throw new Error('root is not a screen')
    expect(screenOutcome(root, undefined)).toBe(root.pass)
    expect(screenOutcome(root, [])).toBe(root.pass)
    expect(screenOutcome(root, '1')).toBe(root.fail)
    expect(screenOutcome(root, ['1'])).toBe(root.fail)
    expect(screenOutcome(root, ['1', '1', '1'])).toBe(root.fail)
  })

  it('leaves nothing unreachable', () => {
    const reachable = reachableIds()
    for (const node of TRIAGE_TREE) {
      expect(reachable, `${node.id} is orphaned`).toContain(node.id)
    }
  })

  it('terminates from every node — no answer path can loop forever', () => {
    // Walk every route depth-first, refusing to revisit a node on the same path.
    // A cycle is the one failure that hangs a patient rather than misrouting
    // them, so it is checked as a path property, not a graph-wide one.
    const byId = new Map(TRIAGE_TREE.map((n) => [n.id, n]))
    const walk = (id: string, seen: readonly string[]) => {
      expect(seen, `cycle through ${id}`).not.toContain(id)
      const node = byId.get(id)
      if (!node) return
      for (const child of childrenOf(node)) walk(child, [...seen, id])
    }
    walk(TRIAGE_ROOT, [])
  })

  it('only ever names a treatment Payload actually seeds', () => {
    for (const node of TRIAGE_TREE) {
      if (node.kind !== 'result') continue
      for (const slug of node.treatments) {
        expect(SEEDED, `${node.id} names "${slug}"`).toContain(slug)
      }
    }
  })

  it('gives every result at least one treatment to tick', () => {
    for (const node of TRIAGE_TREE) {
      if (node.kind !== 'result') continue
      expect(node.treatments.length, node.id).toBeGreaterThan(0)
    }
  })

  it('keeps at least one referral exit', () => {
    // Rule 4: a tree with no way out routes somebody who needs a hospital into
    // a queue. If a future edit removes the last one, that is a bug worth
    // failing the build over rather than a content choice.
    expect(TRIAGE_TREE.filter((n) => n.kind === 'referral').length).toBeGreaterThan(0)
  })

  it('never lets a referral carry treatments', () => {
    // A referral means "do not wait for سنون". If it also pre-ticked boxes it
    // would hand the patient a case form, which is the opposite instruction.
    for (const node of TRIAGE_TREE) {
      if (node.kind !== 'referral') continue
      expect(triageHandoff(node)).toBeNull()
    }
  })

  it('writes no question in the language of a diagnosis', () => {
    // Rule 1. "عندك" addressed to the reader states a finding about them; the
    // tree may only say what something resembles.
    for (const node of TRIAGE_TREE) {
      const text = node.kind === 'result' || node.kind === 'referral' ? node.body : node.text
      expect(text, node.id).not.toMatch(/\bعندك (التهاب|تسوس|تسوّس|خراج)/)
    }
  })
})

describe('resolving a node from the URL', () => {
  it('falls back to the root for anything it does not recognise', () => {
    expect(triageNode(undefined).id).toBe(TRIAGE_ROOT)
    expect(triageNode('').id).toBe(TRIAGE_ROOT)
    expect(triageNode('../../etc/passwd').id).toBe(TRIAGE_ROOT)
    expect(triageNode('<script>').id).toBe(TRIAGE_ROOT)
  })

  it('returns the node asked for when it is real', () => {
    expect(triageNode('result-filling').id).toBe('result-filling')
  })

  it('finds a parent for everything except the root', () => {
    expect(triageParent(TRIAGE_ROOT)).toBeNull()
    for (const node of TRIAGE_TREE) {
      if (node.id === TRIAGE_ROOT) continue
      expect(triageParent(node.id), node.id).not.toBeNull()
    }
  })
})

describe('the handoff to the case form', () => {
  it('carries slugs and nothing else', () => {
    const node = TRIAGE_TREE.find((n) => n.id === 'result-filling')!
    expect(triageHandoff(node)).toBe('filling')
  })

  it('drops anything the form does not know', () => {
    const known = SEEDED.map((id) => ({ id }))
    expect(parseHandoff('filling,not-a-treatment,scaling', known)).toEqual(['filling', 'scaling'])
    expect(parseHandoff('<script>', known)).toEqual([])
    expect(parseHandoff(undefined, known)).toEqual([])
  })
})
