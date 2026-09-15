import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { Card, CardBody, Chip } from '@/components/ui/card'
import { buttonClass, ButtonLink } from '@/components/ui/button'
import { getTreatmentTypes } from '@/lib/config'
import { guide } from '@/lib/copy'
import { TRIAGE_ROOT, triageHandoff, triageNode, triageParent } from '@/lib/triage'

export const metadata: Metadata = { title: guide.title }

/** Treatment names come from Payload, so this cannot be baked once. */
export const revalidate = 300

/**
 * The guided questions.
 *
 * **Every answer is a real `<a href>`, and that is the whole design.** The tree
 * needs state, and the obvious way to hold it is a Client Component — but that
 * means a patient on a slow connection stares at a dead question until the
 * JavaScript arrives, on the one page that exists for people who are already
 * unsure. Putting the current node in the query string instead makes each answer
 * an ordinary link: it works before hydration, with JavaScript disabled, and on
 * a browser that never runs it at all. Next's `<Link>` still prefetches, so
 * after the first tap the rest are instant anyway. The slow path is correct and
 * the fast path is free.
 *
 * **Only the current node is in the URL, never the route taken.** Which answers
 * somebody picked is health information about them, and a path in the query
 * string would follow them into their history, into the `Referer` header on the
 * way out, and into any screenshot they send. "رجوع" is computed from the tree.
 *
 * The form is never reached from a referral — see `tree.ts`, rule 4.
 */
export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const node = triageNode(q)
  const treatments = await getTreatmentTypes()
  const parent = node.id === TRIAGE_ROOT ? null : triageParent(node.id)
  const handoff = triageHandoff(node)

  const nameFor = (slug: string) => treatments.find((t) => t.id === slug)?.nameAr ?? slug

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={guide.eyebrow}
          title={node.kind === 'question' ? guide.title : node.title}
          lead={node.kind === 'question' ? guide.intro : undefined}
        />

        {node.kind === 'question' ? (
          <Card>
            <CardBody>
              <h2 className="text-lg font-bold">{node.text}</h2>
              {node.hint ? (
                <p className="mt-1 text-sm text-foreground-muted">{node.hint}</p>
              ) : null}

              {/* A list, because it is one: a screen reader should say how many
                  choices there are before reading them out. */}
              <ul className="mt-4 flex flex-col gap-2">
                {node.answers.map((answer) => (
                  <li key={answer.next + answer.label}>
                    <Link
                      href={`/case/guide?q=${encodeURIComponent(answer.next)}`}
                      className={buttonClass(
                        'secondary',
                        'w-full justify-start text-start leading-snug',
                      )}
                    >
                      {answer.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {node.kind === 'result' ? (
          <Card tone="accent">
            <CardBody>
              <p className="text-sm">{node.body}</p>

              <p className="mt-4 text-xs text-foreground-muted">{guide.willTick}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {node.treatments.map((slug) => (
                  <li key={slug}>
                    <Chip>{nameFor(slug)}</Chip>
                  </li>
                ))}
              </ul>

              {/* The only thing that crosses into the form is the slugs. No
                  answer text, no node id, nothing about the route taken. */}
              <div className="mt-5">
                <ButtonLink href={`/case/new?t=${encodeURIComponent(handoff ?? '')}`}>
                  {guide.continueToForm}
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ) : null}

        {node.kind === 'referral' ? (
          /* Deliberately offers no route to the case form. Somebody who needs a
             hospital today must not be handed a queue — and a button saying
             "قدّم حالتك" underneath would read as permission to wait. */
          <Card>
            <CardBody>
              {/* Only a real red flag is red. `scope` means "students may not do
                  this one", which is information rather than a warning — the
                  same styling would tell somebody with an aching molar they are
                  in danger when they are not. */}
              <p
                className={`text-sm font-bold ${
                  node.urgency === 'scope' ? 'text-foreground-muted' : 'text-danger'
                }`}
              >
                {node.urgency === 'now'
                  ? guide.referralNow
                  : node.urgency === 'soon'
                    ? guide.referralSoon
                    : guide.referralScope}
              </p>
              <p className="mt-2 text-sm">{node.body}</p>
            </CardBody>
          </Card>
        ) : null}

        {/* The disclaimer sits under every screen, not only the results: it has
            to be true of the questions too, and somebody who stops halfway
            should have read it. */}
        <p className="mt-4 text-xs leading-relaxed text-foreground-muted">{guide.disclaimer}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {parent ? (
            <Link
              href={`/case/guide?q=${encodeURIComponent(parent)}`}
              className={buttonClass('quiet')}
            >
              {guide.back}
            </Link>
          ) : null}
          {node.id !== TRIAGE_ROOT ? (
            <Link href="/case/guide" className={buttonClass('quiet')}>
              {guide.restart}
            </Link>
          ) : null}
          <Link href="/" className={buttonClass('quiet')}>
            {guide.homeLink}
          </Link>
        </div>
      </>
    </PageShell>
  )
}
