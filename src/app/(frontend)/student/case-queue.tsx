import { getAllTreatmentTypes, getStudentCaseScope } from '@/lib/config'
import { WEEK_DAYS } from '@/lib/config/schema'
import { getMaxActiveClaimsPerStudent } from '@/lib/config/settings'
import { listOpenCasesForStudent } from '@/db/queries/cases'
import { pendingRequestCaseIds } from '@/db/queries/day-requests'
import { listCasePhotos } from '@/db/queries/case-photos'
import { CasePhotoGrid } from '@/components/case-photo-grid'
import { Card, CardBody, CardRibbon, Chip, MetaRow } from '@/components/ui/card'
import { AlertIcon, CalendarIcon, CheckIcon, ClockIcon, NoteIcon } from '@/components/ui/icon'
import { PageHeader } from '@/components/ui/section'
import { caseForm, casePhotos as photoCopy, caseStatus, studentQueue } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { QueueFilter } from './queue-filter'
import { ClaimButton } from './claim-button'
import { AskDaysButton } from './ask-days-button'

/**
 * The queue a verified student sees.
 *
 * Scoped to their clinic's city and to cases that overlap what their stage may
 * treat there. Overlap, not containment: a case wanting a filling and a root
 * canal is a fourth year's case for the filling, and hiding it because of the
 * root canal would leave the patient waiting for a student who can do both. What
 * their stage may not perform is marked, and handed on after their part is done.
 *
 * A missing capability mapping yields an empty queue with an explanation rather
 * than a silent nothing — an admin can act on "capabilities are not set", but
 * not on a blank page.
 *
 * Presented as clinical cases, not as people: a reference code, what is needed,
 * and when. No names, and nothing to rank or browse.
 */
/**
 * Read a repeated query parameter as a validated set.
 *
 * Validated against the real list rather than trusted, for the reason the guide
 * handoff already gives: an edited URL or a renamed slug must mean fewer filters
 * rather than a broken page. It is belt and braces — what survives is passed as
 * a narrowing, so even an unfiltered forgery could only ever show less — but the
 * belt is what keeps the braces from being load-bearing.
 */
function selectedFrom(
  params: Record<string, string | string[] | undefined>,
  key: string,
  allowed: readonly string[],
): string[] {
  const raw = params[key]
  const values = Array.isArray(raw) ? raw : raw ? [raw] : []
  return [...new Set(values.filter((value) => allowed.includes(value)))]
}

export async function CaseQueue({
  studentId,
  universityId,
  stageId,
  clinicDays,
  heldCount,
  params,
}: {
  studentId: string
  universityId: string
  stageId: string
  /** Empty means "any day" — every student recorded before clinic days existed. */
  clinicDays: readonly string[]
  /** How many cases this student is already holding. */
  heldCount: number
  /** The raw query string. Validated here, against this student's own scope. */
  params: Record<string, string | string[] | undefined>
}) {
  const scope = await getStudentCaseScope(universityId, stageId)

  if (scope.cityIds.length === 0 || scope.treatmentTypeIds.length === 0) {
    return (
      <Card>
        <CardBody className="p-5">
          <h2 className="font-bold">{studentQueue.noScopeTitle}</h2>
          <p className="mt-2 text-sm text-foreground-muted">{studentQueue.noScopeBody}</p>
        </CardBody>
      </Card>
    )
  }

  const [allTreatments, claimLimit] = await Promise.all([
    getAllTreatmentTypes(),
    getMaxActiveClaimsPerStudent(),
  ])

  /**
   * Only what this stage may treat. Filtering by anything else is not a filter,
   * it is a request for somebody else's queue — so those values are dropped
   * here rather than passed on and relied upon to match nothing.
   */
  const filterableTreatments = allTreatments.filter((treatment) =>
    scope.treatmentTypeIds.includes(treatment.id),
  )

  const filterDays = selectedFrom(params, 'd', WEEK_DAYS)
  const filterTreatments = selectedFrom(
    params,
    't',
    filterableTreatments.map((treatment) => treatment.id),
  )
  const filtering = filterDays.length > 0 || filterTreatments.length > 0

  // Narrowing, never widening: `scope` decides what this student may see and
  // these can only remove from it. Feeding a query string into
  // `treatmentTypeIds` instead would be a fourth year asking for a fifth year's
  // queue and getting it.
  const cases = await listOpenCasesForStudent(studentId, {
    ...scope,
    onlyDays: filterDays,
    onlyTreatmentTypeIds: filterTreatments,
  })
  const treatments = allTreatments

  /**
   * At the cap the list is still drawn in full and only the button goes.
   *
   * The opposite — swapping the queue for the held case — is what this page did
   * and it is the mistake worth not repeating: a student cannot tell an empty
   * سنون from one that is refusing them, and they leave on the first reading.
   * `claimCaseForStudent` refuses the same thing server-side, so this is the
   * explanation rather than the rule.
   */
  const atLimit = heldCount >= claimLimit

  const capableSet = new Set(scope.treatmentTypeIds)
  const anyOtherStage = cases.some((entry) =>
    entry.treatmentTypeIds.some((id) => !capableSet.has(id)),
  )

  /**
   * Whether this student could actually attend a case's days.
   *
   * A student with no clinic days recorded is treated as available on any day,
   * which is what every student looked like before the field existed — adding it
   * must not silently empty their queue.
   */
  const clinic = new Set(clinicDays)
  const canAttend = (days: readonly string[]) =>
    clinic.size === 0 || days.some((day) => clinic.has(day))

  const alreadyAsked = await pendingRequestCaseIds(studentId)

  const photosByCase = new Map(
    await Promise.all(
      cases.map(async (entry) => [entry.id, await listCasePhotos(entry.id)] as const),
    ),
  )

  /*
   * An empty list has two quite different meanings and must never use one
   * sentence for both. "There are no cases" to a student who has filtered
   * themselves down to nothing reads as سنون being empty, and they leave —
   * which is the same failure this codebase records for an unseeded config
   * list. The filtered version says what is in the way and how to clear it, and
   * the filter itself stays on screen to be cleared.
   */
  const header = (
    <>
      <PageHeader
        eyebrow={studentQueue.eyebrow}
        title={studentQueue.title}
        lead={studentQueue.intro}
      />
      <QueueFilter
        treatments={filterableTreatments}
        selectedDays={filterDays}
        selectedTreatments={filterTreatments}
      />
    </>
  )

  if (cases.length === 0) {
    return (
      <div className="space-y-4">
        {filtering ? header : null}
        <Card>
          <CardBody className="p-5">
            <h2 className="font-bold">
              {filtering ? studentQueue.filteredEmptyTitle : studentQueue.emptyTitle}
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {filtering ? studentQueue.filteredEmptyBody : studentQueue.emptyBody}
            </p>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}

      {/* The count above the list. A student opening this page again wants to
          know whether anything is here before reading a single card. */}
      <p className="text-sm font-bold text-accent">{studentQueue.count(cases.length)}</p>

      {atLimit ? (
        <div className="rounded-lg border border-warm bg-warm-muted p-3">
          <p className="text-sm font-bold">{studentQueue.limitReachedTitle}</p>
          <p className="mt-1 text-xs text-foreground">
            {studentQueue.limitReachedBody(claimLimit)}
          </p>
        </div>
      ) : null}

      {anyOtherStage ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs text-foreground-muted">
          <AlertIcon className="mt-0.5 text-warm" />
          <span>{studentQueue.otherStageHint}</span>
        </p>
      ) : null}

      {cases.map((entry) => {
        /**
         * A case can ask for more than one stage can treat — a root canal is
         * fifth year, a partial denture is fourth. The student sees the whole
         * case and which parts are theirs, rather than the case being hidden:
         * they can take it, do their part, and hand the rest back.
         */
        const chips = entry.treatmentTypeIds.map((id) => ({
          name: treatments.find((t) => t.id === id)?.nameAr ?? id,
          mine: capableSet.has(id),
        }))

        /**
         * A case whose days this student could never attend is shown, not
         * hidden — the patient may well be able to come on another day, and only
         * they can say. What the student cannot do is claim it: that would take
         * the case off the queue for an appointment nobody can keep.
         */
        const attendable = canAttend(entry.availabilityDays)
        const offerDays = attendable
          ? []
          : clinicDays
              .filter((day) => !entry.availabilityDays.includes(day))
              .map((day) => caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day)
        const days = entry.availabilityDays
          .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
          .map((day) => caseForm.weekDays[day])
          .join('، ')

        return (
          <Card key={entry.id}>
            {/* The status across the top, in its own colour. Every case in this
                queue is REQUESTED — the ribbon is not there to distinguish them
                from each other but to say, before anything else is read, that
                nobody has taken this one. */}
            <CardRibbon
              label={caseStatus.REQUESTED}
              detail={attendable ? undefined : studentQueue.dayMismatchTag}
              tone={attendable ? 'accent' : 'warning'}
            />

            <CardBody>
              <p className="text-xs text-foreground-muted">
                {studentQueue.caseReference}{' '}
                <span className="reference-code font-bold text-foreground">
                  {entry.referenceCode}
                </span>
              </p>

              {/* Treatments as chips. A dashed, muted chip is one this student's
                  stage may not perform — present on the case, not theirs to do.
                  That distinction was already computed and was rendered as a
                  sentence; as a chip it is read without being read. */}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <li key={chip.name}>
                    <Chip
                      tone={chip.mine ? 'accent' : 'muted'}
                      icon={chip.mine ? <CheckIcon className="size-3.5" /> : null}
                    >
                      {chip.name}
                      {chip.mine ? null : (
                        <span className="font-normal">— {studentQueue.otherStageTag}</span>
                      )}
                    </Chip>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-1.5">
                <MetaRow icon={<CalendarIcon />} label={studentQueue.caseDays}>
                  {days}
                </MetaRow>
                {entry.notes ? (
                  <MetaRow icon={<NoteIcon />} label={studentQueue.caseNotes}>
                    <span className="text-foreground-muted">{entry.notes}</span>
                  </MetaRow>
                ) : null}
                <MetaRow icon={<ClockIcon />} label={studentQueue.caseSubmitted}>
                  <span className="text-foreground-muted">{formatCaseDate(entry.createdAt)}</span>
                </MetaRow>
              </div>

              <CasePhotoGrid
                photos={photosByCase.get(entry.id) ?? []}
                label={photoCopy.studentLabel}
              />

              {attendable ? (
                <ClaimButton caseId={entry.id} atLimit={atLimit} limit={claimLimit} />
              ) : (
                <div className="mt-3 rounded-md bg-warm-muted p-3">
                  <p className="flex items-start gap-2 text-xs text-foreground">
                    <AlertIcon className="mt-0.5 text-warm" />
                    <span>{studentQueue.dayMismatchBody}</span>
                  </p>
                  {offerDays.length > 0 ? (
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-foreground-muted">
                        {studentQueue.dayMismatchOffer}:
                      </span>
                      {offerDays.map((day) => (
                        <Chip key={day} tone="warning">
                          {day}
                        </Chip>
                      ))}
                    </p>
                  ) : null}
                  <AskDaysButton caseId={entry.id} alreadyAsked={alreadyAsked.has(entry.id)} />
                </div>
              )}
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
