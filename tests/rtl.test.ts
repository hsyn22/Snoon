import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Arabic is the product and RTL is the default direction, so physical
 * direction utilities are a bug rather than a style preference: `ml-4` puts
 * the gap on the wrong side of every Arabic screen. This test is the guard —
 * it fails the build rather than waiting for someone to notice the layout.
 *
 * Use the logical equivalents: ms/me, ps/pe, start/end, text-start/text-end,
 * border-s/border-e, rounded-s/rounded-e.
 */

const SOURCE_ROOT = join(import.meta.dirname, '..', 'src')
const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.css']

/** Each rule names the physical thing to reject and the logical replacement. */
const FORBIDDEN: Array<{ pattern: RegExp; use: string }> = [
  { pattern: /\bm[lr]-(?!\[)[\w.[\]/-]+/g, use: 'ms-* / me-*' },
  { pattern: /\bp[lr]-(?!\[)[\w.[\]/-]+/g, use: 'ps-* / pe-*' },
  { pattern: /\btext-(?:left|right)\b/g, use: 'text-start / text-end' },
  { pattern: /(?<![\w-])(?:left|right)-(?:\d|\[|full|auto|px)/g, use: 'start-* / end-*' },
  { pattern: /\bborder-[lr](?:-[\w.[\]/-]+)?(?![\w-])/g, use: 'border-s-* / border-e-*' },
  { pattern: /\brounded-(?:[lr]|[tb][lr])(?:-[\w.[\]/-]+)?(?![\w-])/g, use: 'rounded-s-* / rounded-e-*' },
  { pattern: /(?<![\w-])(?:margin|padding|border)-(?:left|right)\b/g, use: 'the -inline-start / -inline-end property' },
  { pattern: /(?<![\w-])(?:left|right)\s*:/g, use: 'inset-inline-start / inset-inline-end' },
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return SCANNED_EXTENSIONS.some((ext) => path.endsWith(ext)) ? [path] : []
  })
}

describe('RTL: logical properties only', () => {
  const files = sourceFiles(SOURCE_ROOT)

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s uses no physical direction properties', (file) => {
    const contents = readFileSync(file, 'utf8')
    const violations = FORBIDDEN.flatMap(({ pattern, use }) =>
      // The regexes are global; match against a fresh copy so lastIndex never leaks.
      [...contents.matchAll(new RegExp(pattern.source, pattern.flags))].map(
        (match) => `"${match[0]}" — use ${use} instead`,
      ),
    )

    expect(violations, `${file} uses physical direction properties`).toEqual([])
  })
})
