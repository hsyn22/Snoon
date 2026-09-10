import type { Metadata } from 'next'
import Link from 'next/link'
import type { LegalSection } from '@/lib/legal'
import { common, site } from '@/lib/copy'

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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-pretty text-foreground-muted">{intro}</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-semibold">{section.heading}</h2>
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

        <Link href="/" className="mt-10 inline-block text-sm text-accent underline">
          {common.backHome}
        </Link>
      </main>
    </div>
  )
}

export function legalMetadata(title: string): Metadata {
  return { title, robots: { index: true, follow: true } }
}
