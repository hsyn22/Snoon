import { getAllTreatmentTypes, getStudentCaseScope } from '@/lib/config'
import { listOpenCasesForStudent } from '@/db/queries/cases'
import { caseForm, studentQueue } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { ClaimButton } from './claim-button'

/**
 * The queue a verified student sees.
 *
 * Scoped to their clinic's city and to what their stage may treat there, so they
 * never open a case they cannot take. A missing capability mapping yields an
 * empty queue with an explanation rather than a silent nothing — an admin can
 * act on "capabilities are not set", but not on a blank page.
 *
 * Presented as clinical cases, not as people: a reference code, what is needed,
 * and when. No names, and nothing to rank or browse.
 */
export async function CaseQueue({
  studentId,
  collegeId,
  stageId,
}: {
  studentId: string
  collegeId: string
  stageId: string
}) {
  const scope = await getStudentCaseScope(collegeId, stageId)

  if (scope.cityIds.length === 0 || scope.treatmentTypeIds.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">{studentQueue.noScopeTitle}</h2>
        <p className="mt-2 text-sm text-foreground-muted">{studentQueue.noScopeBody}</p>
      </section>
    )
  }

  const [cases, treatments] = await Promise.all([
    listOpenCasesForStudent(studentId, scope),
    getAllTreatmentTypes(),
  ])

  if (cases.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">{studentQueue.emptyTitle}</h2>
        <p className="mt-2 text-sm text-foreground-muted">{studentQueue.emptyBody}</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{studentQueue.title}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{studentQueue.intro}</p>
      </div>

      {cases.map((entry) => {
        const treatmentNames = entry.treatmentTypeIds
          .map((id) => treatments.find((t) => t.id === id)?.nameAr ?? id)
          .join('، ')
        const days = entry.availabilityDays
          .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
          .map((day) => caseForm.weekDays[day])
          .join('، ')

        return (
          <article key={entry.id} className="rounded-lg border border-border bg-surface p-4">
            <p className="reference-code text-sm font-bold">{entry.referenceCode}</p>

            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-foreground-muted">{studentQueue.caseTreatments}</dt>
                <dd className="font-medium">{treatmentNames}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground-muted">{studentQueue.caseDays}</dt>
                <dd>{days}</dd>
              </div>
              {entry.notes ? (
                <div>
                  <dt className="text-xs text-foreground-muted">{studentQueue.caseNotes}</dt>
                  <dd className="text-foreground-muted">{entry.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-foreground-muted">{studentQueue.caseSubmitted}</dt>
                <dd className="text-foreground-muted">{formatCaseDate(entry.createdAt)}</dd>
              </div>
            </dl>

            <ClaimButton caseId={entry.id} />
          </article>
        )
      })}
    </div>
  )
}
