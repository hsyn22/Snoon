import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { Card, CardBody, Chip } from '@/components/ui/card'
import { optionClass } from '@/components/ui/field'
import { buttonClass, ButtonLink } from '@/components/ui/button'
import { getTreatmentTypes } from '@/lib/config'
import { guide } from '@/lib/copy'
import {
  TRIAGE_ROOT,
  screenOutcome,
  triageHandoff,
  triageLayer,
  triageNode,
  triageParent,
} from '@/lib/triage'

export const metadata: Metadata = { title: guide.title }

/**
 * A maps **search**, not a pin.
 *
 * `/maps/search/?api=1&query=…` runs the query against the device's own
 * location, so it lists the emergency departments actually near whoever tapped
 * it — سنون never learns where they are and does not have to. A `@lat,lng` URL
 * would need a location سنون does not have at this point in the flow, and a
 * plain `/maps` link opens the map showing nothing in particular, which is the
 * version that is no help at all.
 *
 * The query is the Arabic for "emergency hospital", which is what the signs and
 * the listings here actually say.
 */
const HOSPITAL_SEARCH =
  'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('مستشفى طوارئ')

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
  searchParams: Promise<{ q?: string; red?: string | string[] }>
}) {
  const { q, red } = await searchParams

  /*
   * The emergency screen submits as a plain GET form, so its answer arrives
   * here as `red` alongside the node it was aiming at. Any tick at all
   * redirects to the emergency card instead of continuing — see
   * `screenOutcome`, which reads only whether there were any, never which.
   */
  const asked = triageNode(q)
  const from = q ? triageNode(triageParent(asked.id) ?? '') : null
  const node =
    from?.kind === 'screen' && red !== undefined
      ? triageNode(screenOutcome(from, red))
      : asked
  const treatments = await getTreatmentTypes()
  const parent = node.id === TRIAGE_ROOT ? null : triageParent(node.id)
  const handoff = triageHandoff(node)

  const nameFor = (slug: string) => treatments.find((t) => t.id === slug)?.nameAr ?? slug

  const layer = triageLayer(node.id)

  return (
    <PageShell>
      {/* `guide-flow` is what tells the page-level fade to stand down, so only
          the card moves between questions rather than the whole screen. */}
      <div className="guide-flow">
        {/* Three fixed layers, not a bar filled by depth — the paths are not
            the same length, so a proportion would promise a distance no route
            guarantees. */}
        <ol className="guide-steps" aria-label={guide.eyebrow}>
          {guide.steps.map((step, index) => {
            const n = index + 1
            const state = layer === 'done' ? 'done' : n < layer ? 'done' : n === layer ? 'current' : 'todo'
            return (
              <li key={step} className="guide-step" data-state={state}>
                <span aria-hidden="true" />
                {step}
              </li>
            )
          })}
        </ol>

        <PageHeader
          eyebrow={guide.eyebrow}
          title={node.kind === 'question' || node.kind === 'screen' ? guide.title : node.title}
          lead={node.kind === 'question' || node.kind === 'screen' ? guide.intro : undefined}
        />

        {node.kind === 'screen' ? (
          /*
           * A GET form, which is what keeps this page working with no
           * JavaScript at all — the browser builds the query string itself and
           * navigates, exactly as the answer links do everywhere else.
           *
           * Every box carries the same name and the same value. The server only
           * ever counts them, never reads them: which symptoms somebody ticked
           * is health information, and the tree's third rule is that none of it
           * is carried anywhere. A distinct value per box would put a list of a
           * stranger's symptoms into their browser history.
           */
          <form method="get" action="/case/guide">
            <input type="hidden" name="q" value={node.pass} />
            <Card className="guide-card">
              <CardBody>
                <fieldset>
                  <legend className="text-lg font-bold">{node.text}</legend>
                  {node.hint ? (
                    <p className="mt-1 text-sm text-foreground-muted">{node.hint}</p>
                  ) : null}
                  <ul className="mt-4 flex flex-col gap-2">
                    {node.items.map((item) => (
                      <li key={item}>
                        <label className={optionClass}>
                          <input type="checkbox" name="red" value="1" className="size-4" />
                          <span className="leading-snug">{item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
                <button type="submit" className={buttonClass('primary', 'mt-5 w-full')}>
                  {guide.screenContinue}
                </button>
              </CardBody>
            </Card>
          </form>
        ) : null}

        {node.kind === 'question' ? (
          <Card className="guide-card">
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
          <Card tone="accent" className="guide-card">
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
          <Card className="guide-card">
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

              {node.urgency === 'now' ? (
                /* Taken from AsnanLink, and the one genuinely practical thing
                   on their emergency screen: telling somebody to go to a
                   hospital is advice, handing them the map is help. A plain
                   maps search, so it opens the app a phone already has and
                   costs سنون nothing. `noreferrer` because the tracking token
                   lives in URLs on neighbouring pages and this is a link out. */
                <a
                  href={HOSPITAL_SEARCH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass('primary', 'mt-4 w-full')}
                >
                  {guide.findHospital}
                </a>
              ) : null}

              {/*
                * The way past, on Haider's instruction.
                *
                * سنون deliberately had none, and the reason still stands: a
                * route to the queue sitting under "go to a hospital now" reads
                * as permission to wait. His counter is the stronger one —
                * somebody who has already been to hospital, or mis-tapped, or
                * whose tooth came out last week rather than today, was left on
                * a dead end with nothing but "start over".
                *
                * So it is built to be *chosen* rather than tapped past: a quiet
                * link well below the hospital button, never a second button
                * competing with it, and worded as a claim the person makes
                * about themselves rather than as a dismissal of the warning.
                */}
              <p className="mt-5 border-t border-border pt-4 text-xs text-foreground-muted">
                {guide.overrideLead}
              </p>
              <Link
                href="/case/new"
                className="mt-1 inline-block text-sm font-bold text-accent underline-offset-4 hover:underline"
              >
                {guide.overrideAction}
              </Link>
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
      </div>
    </PageShell>
  )
}
