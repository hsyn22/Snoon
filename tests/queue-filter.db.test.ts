import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The student's own filter on the queue — days and treatments, several of each.
 *
 * Two of these are ordinary feature tests. The third is the one that matters,
 * and it is why the filter fields are named `onlyDays` and
 * `onlyTreatmentTypeIds` rather than reusing `treatmentTypeIds`:
 *
 * **`treatmentTypeIds` is the scope and comes from the server** — this
 * student's university and stage decide it. **The filter comes off a query
 * string a student types.** They have the same shape, and passing one where the
 * other belongs would turn `?t=root-canal` into a fourth year asking for a
 * fifth year's queue and being handed it. So the filter is an additional
 * condition and can only ever remove rows.
 *
 * The sort is asserted too, because it was reversed on Haider's instruction and
 * a silent revert would be invisible until somebody noticed old cases at the top.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('filtering the queue', async () => {
  if (!hasDatabase) return

  const { eq, inArray } = await import('drizzle-orm')
  const { db } = await import('@/db')
  const { cases, students } = await import('@/db/schema')
  const { listOpenCasesForStudent } = await import('@/db/queries/cases')

  let studentId = ''
  const caseIds: string[] = []
  const codes: Record<string, string> = {}

  /** Straight to the table: these need particular treatments and days, and one
      needs a `createdAt` in the past to make the sort assertion mean something. */
  async function seed(
    label: string,
    treatmentTypeIds: string[],
    availabilityDays: string[],
    createdAt: Date,
  ) {
    const referenceCode = `SN-F${label.toUpperCase()}`
    const [row] = await db
      .insert(cases)
      .values({
        referenceCode,
        cityId: 'basra',
        treatmentTypeIds,
        availabilityDays,
        patientName: 'اختبار الفلتر',
        patientPhone: '',
        // Required and never null: every case has a tracking link, and the
        // column holds an HMAC of it rather than the token. Nothing here reads
        // it back, so any distinct value does.
        trackingTokenHash: `filter-test-${crypto.randomUUID()}`,
        status: 'REQUESTED',
        createdAt,
      })
      .returning({ id: cases.id })
    if (!row) throw new Error('case insert returned no row')
    caseIds.push(row.id)
    codes[label] = referenceCode
    return row.id
  }

  /** Cases this student can see, by reference code. */
  async function visible(filter: Parameters<typeof listOpenCasesForStudent>[1]) {
    const rows = await listOpenCasesForStudent(studentId, filter)
    return rows
      .filter((row) => row.referenceCode.startsWith('SN-F'))
      .map((row) => row.referenceCode)
  }

  /** What a fourth year may treat — the scope, decided by the server. */
  const scope = { cityIds: ['basra'], treatmentTypeIds: ['filling', 'extraction'] }

  beforeAll(async () => {
    const [student] = await db
      .insert(students)
      .values({
        authUserId: `queue-filter-${crypto.randomUUID()}`,
        fullName: 'طالب اختبار الفلتر',
        universityId: 'test-university',
        stageId: 'stage-4',
        clinicDays: [],
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    if (!student) throw new Error('student insert returned no row')
    studentId = student.id

    // Oldest first in insertion order, so "newest first" is a real assertion
    // rather than something insertion order would satisfy by accident.
    await seed('old', ['filling'], ['sat'], new Date('2026-09-01T08:00:00Z'))
    await seed('mid', ['extraction'], ['tue'], new Date('2026-09-05T08:00:00Z'))
    await seed('new', ['filling', 'extraction'], ['sat', 'tue'], new Date('2026-09-10T08:00:00Z'))
    // Out of scope for a fourth year: it must never appear, filter or no filter.
    await seed('rc', ['root-canal'], ['sat'], new Date('2026-09-11T08:00:00Z'))
  })

  afterAll(async () => {
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    if (studentId) await db.delete(students).where(eq(students.id, studentId))
  })

  it('lists newest first', async () => {
    expect(await visible(scope)).toEqual([codes.new, codes.mid, codes.old])
  })

  it('narrows by day, and takes more than one', async () => {
    expect(await visible({ ...scope, onlyDays: ['tue'] })).toEqual([codes.new, codes.mid])
    expect(await visible({ ...scope, onlyDays: ['sat'] })).toEqual([codes.new, codes.old])
    // Several days is "any of", not "all of": a student in clinic on two days
    // can attend a case that offers either.
    expect(await visible({ ...scope, onlyDays: ['sat', 'tue'] })).toEqual([
      codes.new,
      codes.mid,
      codes.old,
    ])
  })

  it('narrows by treatment, and takes more than one', async () => {
    expect(await visible({ ...scope, onlyTreatmentTypeIds: ['extraction'] })).toEqual([
      codes.new,
      codes.mid,
    ])
    expect(await visible({ ...scope, onlyTreatmentTypeIds: ['filling', 'extraction'] })).toEqual([
      codes.new,
      codes.mid,
      codes.old,
    ])
  })

  it('combines both lists', async () => {
    expect(
      await visible({ ...scope, onlyDays: ['tue'], onlyTreatmentTypeIds: ['filling'] }),
    ).toEqual([codes.new])
  })

  /**
   * The one that is not a convenience.
   *
   * A student typing `?t=root-canal` into the URL is asking for a treatment
   * their stage may not perform. The filter must answer with *nothing extra* —
   * it narrows inside the scope. If this ever fails, somebody has wired the
   * query string into `treatmentTypeIds` and the queue has stopped being an
   * access-control boundary.
   */
  it('cannot be used to reach outside the stage scope', async () => {
    expect(await visible({ ...scope, onlyTreatmentTypeIds: ['root-canal'] })).toEqual([])
    expect(await visible({ ...scope, onlyTreatmentTypeIds: ['root-canal', 'filling'] })).toEqual([
      codes.new,
      codes.old,
    ])
  })

  it('treats an empty filter as no filter', async () => {
    // The page passes `[]` whenever nothing is ticked, which must not be read
    // as "match nothing" — that would empty every student's queue by default.
    expect(await visible({ ...scope, onlyDays: [], onlyTreatmentTypeIds: [] })).toEqual([
      codes.new,
      codes.mid,
      codes.old,
    ])
  })
})
