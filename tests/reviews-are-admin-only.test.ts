import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Reviews are admin-only, stated as a property of the source tree.
 *
 * `tests/reviews.db.test.ts` checks what a review holds. This checks who can
 * read one, and it is the rule that would erode rather than break: the whole
 * justification for building reviews at all — Haider's "للان فقط للادمن، و يكون
 * بشكل عام عن الخدمة و سنون" — is that nothing rates a person and nothing
 * outside the admin reads the table.
 *
 * The moment a queue sorts by a score, or a case card shows an average, or a
 * student is told what somebody said about a case, a feedback box has become a
 * reputation system — and with it a reason for students to compete over
 * patients, which this project refuses in three separate places and which is
 * the exact thing that makes عالجني a different product.
 *
 * So: the reading functions may be imported by the admin view and by tests, and
 * the writing path may be imported by the two review actions. Anything else
 * importing them is this rule being crossed, and it fails here rather than in a
 * review somebody skims.
 */

const SOURCE_ROOT = join(import.meta.dirname, '..', 'src')

/** Files allowed to read reviews, and why each one is. */
const READERS_ALLOWED = [
  // The admin view. The only place a review is ever displayed.
  'src/payload/views/reviews.tsx',
  // The two pages decide whether to offer the form, which needs to know only
  // whether this side has already answered — never what anybody said.
  'src/app/(frontend)/case/track/[token]/page.tsx',
  'src/app/(frontend)/student/case/[caseId]/page.tsx',
]

/** Files allowed to write one: the two actions, one per side. */
const WRITERS_ALLOWED = [
  'src/app/(frontend)/case/track/[token]/review-actions.ts',
  'src/app/(frontend)/student/case/[caseId]/review-actions.ts',
]

/** Functions that return what somebody said, as opposed to whether they said it. */
const READING_FUNCTIONS = ['listReviewsForAdmin', 'summariseReviews']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })
}

function relative(path: string): string {
  return path.slice(path.indexOf('src/'))
}

describe('reviews never leave the admin', () => {
  const files = sourceFiles(SOURCE_ROOT)

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('is read only by the admin view', () => {
    const offenders = files.filter((path) => {
      const name = relative(path)
      if (READERS_ALLOWED.includes(name) || name === 'src/db/queries/reviews.ts') return false
      const contents = readFileSync(path, 'utf8')
      return READING_FUNCTIONS.some((fn) => contents.includes(fn))
    })

    expect(
      offenders.map(relative),
      'A review may only be displayed inside the admin. See src/db/queries/reviews.ts.',
    ).toEqual([])
  })

  it('is written only by the two review actions', () => {
    const offenders = files.filter((path) => {
      const name = relative(path)
      if (WRITERS_ALLOWED.includes(name) || name === 'src/db/queries/reviews.ts') return false
      return readFileSync(path, 'utf8').includes('submitReview')
    })

    expect(offenders.map(relative)).toEqual([])
  })

  /**
   * The `reviews` table itself, reachable only through its own query module.
   *
   * A hand-written join from, say, the queue would bypass every one of the
   * rules above while looking perfectly ordinary in a diff.
   */
  it('is queried only through its own module', () => {
    const offenders = files.filter((path) => {
      const name = relative(path)
      if (name === 'src/db/queries/reviews.ts' || name === 'src/db/schema.ts') return false
      const contents = readFileSync(path, 'utf8')
      /*
       * The binding list of the schema import, not the word anywhere in the
       * file. Matching the word flagged every file that imports from
       * `@/db/queries/reviews` — the path contains it — which is the opposite of
       * what this asserts.
       */
      return [...contents.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@\/db\/schema'/g)].some(
        (match) =>
          match[1]!
            .split(',')
            .map((binding) => binding.trim())
            .includes('reviews'),
      )
    })

    expect(
      offenders.map(relative),
      'Query reviews through src/db/queries/reviews.ts, never by importing the table.',
    ).toEqual([])
  })
})
