import type { Metadata } from 'next'
import type { LegalSection } from '@/lib/legal'
import { PageShell } from '@/components/site-chrome'
import { ButtonLink } from '@/components/ui/button'
import { common } from '@/lib/copy'

/**
 * The privacy notice and the terms share a shape, so they share a component.
 *
 * Plain and dense on purpose: this is a page someone reads once, on a phone,
 * when they are already unsure whether to trust the thing. Nothing to interact
 * with, nothing to scroll past.
 */
export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string
  intro: string
  sections: readonly LegalSection[]
}) {
  return (
    <PageShell width="wide">
      <>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-pretty text-foreground-muted">{intro}</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-bold">{section.heading}</h2>
              <div className="mt-2 space-y-2 text-sm text-foreground-muted">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-pretty">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10">
          <ButtonLink href="/" variant="quiet" className="text-sm">
            {common.backHome}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}

export function legalMetadata(title: string): Metadata {
  return { title, robots: { index: true, follow: true } }
}
