import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import {
  getCaseForClaimant,
  getClosedCaseForStudent,
  getCurrentAppointment,
} from '@/db/queries/cases'
import { auth } from '@/lib/auth'
import { getAllTreatmentTypes, getStageCapabilityTreatmentIds } from '@/lib/config'
import {
  caseForm,
  casePhotos as photoCopy,
  caseStatus,
  studentClaim,
  studentLifecycle,
} from '@/lib/copy'
import { CASE_REASON } from '@/lib/cases/reasons'
import { formatAppointment, formatCaseDateTime, toBaghdadInputValue } from '@/lib/dates'
import { formatPhoneForDisplay } from '@/lib/phone'
import { listCasePhotos } from '@/db/queries/case-photos'
import { CasePhotoGrid } from '@/components/case-photo-grid'
import { Card, CardBody, CardRibbon, Chip, statusTone } from '@/components/ui/card'
import { AlertIcon, CalendarIcon, CheckIcon, NoteIcon, PhoneIcon, UserIcon } from '@/components/ui/icon'
import { PageShell } from '@/components/site-chrome'
import { ButtonLink } from '@/components/ui/button'
import { AssertContact } from './assert-contact'
import { WrongNumberReport } from './wrong-number'
import { AppointmentStep, OutcomeStep, RemainderStep } from './lifecycle-steps'

export const metadata: Metadata = {
  title: studentClaim.title,
  // Contact details. Never indexed, never cached.
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

function Row({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <dt className="flex items-center gap-1.5 text-xs text-foreground-muted">
        {icon ? <span className="text-accent">{icon}</span> : null}
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

/**
 * The claimant's view of a case — the only screen in the product that shows a
 * patient's phone number to a student.
 *
 * Authorisation is `getCaseForClaimant`, which joins to an ACTIVE claim by this
 * student. There is no argument combination that yields contact details to
 * anyone else, so a student who lost the case to the contact window sees the
 * not-found panel rather than a stale phone number.
 */
export default async function ClaimedCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id, collegeId: students.collegeId, stageId: students.stageId })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const record = await getCaseForClaimant(caseId, student.id)

  if (!record) {
    // The claim closes when the case ends, so a student who just finished one
    // would otherwise be told their case does not exist. Show the outcome
    // instead — without contact details, which the closed claim no longer grants.
    const closed = await getClosedCaseForStudent(caseId, student.id)

    return (
      <PageShell>
        {closed ? (
          <>
            <h1 className="text-2xl font-bold">
              {closed.releaseReason === CASE_REASON.PART_COMPLETED
                ? studentLifecycle.handedOnTitle
                : studentLifecycle.closedTitle}
            </h1>
            <p className="reference-code mt-2 text-sm font-bold">{closed.referenceCode}</p>
            <p className="mt-2 text-foreground-muted">
              {/* A shared case does not close when the first student finishes:
                  it goes back to the queue carrying what their stage may not
                  treat. "Waiting for a student" is the case's status, not this
                  student's, so their claim says what happened to them. */}
              {closed.releaseReason === CASE_REASON.PART_COMPLETED
                ? studentLifecycle.closedHandedOn
                : closed.status === 'COMPLETED'
                  ? studentLifecycle.closedCompleted
                  : closed.status === 'NO_SHOW'
                    ? studentLifecycle.closedNoShow
                    : closed.status === 'CANCELLED'
                      ? studentLifecycle.closedCancelled
                      : caseStatus[closed.status]}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{studentClaim.notFoundTitle}</h1>
            <p className="mt-2 text-foreground-muted">{studentClaim.notFoundBody}</p>
          </>
        )}
        <div className="mt-6">
          <ButtonLink href="/student" variant="secondary">
            {studentClaim.backToQueue}
          </ButtonLink>
        </div>
      </PageShell>
    )
  }

  const [treatments, appointment, photos, capable] = await Promise.all([
    getAllTreatmentTypes(),
    getCurrentAppointment(caseId),
    listCasePhotos(caseId),
    getStageCapabilityTreatmentIds(student.collegeId, student.stageId),
  ])
  const nameOfTreatment = (id: string) => treatments.find((t) => t.id === id)?.nameAr ?? id
  const treatmentChips = record.treatmentTypeIds.map((id) => ({
    name: nameOfTreatment(id),
    mine: true,
  }))

  /**
   * What this case still needs that this student's stage may not perform.
   *
   * A root canal is fifth year and a partial denture is fourth, so a case asking
   * for both needs two students. Computed here rather than passed from the
   * client, and passed to the step that hands it on.
   */
  const capableSet = new Set(capable)
  const remainingForOtherStage = record.treatmentTypeIds
    .filter((id) => !capableSet.has(id))
    .map(nameOfTreatment)
  const days = record.availabilityDays
    .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
    .map((day) => caseForm.weekDays[day])
    .join('، ')

  return (
    <PageShell
      action={
        <Link href="/student" className="text-sm text-foreground-muted underline">
          {studentClaim.backToQueue}
        </Link>
      }
    >
      <>
        {/* The status first, and in colour: the whole page changes meaning with
            it — whether to ring, whether to book, whether it is finished. */}
        <Card className="mb-4">
          <CardRibbon
            label={caseStatus[record.status]}
            detail={studentClaim.title}
            tone={statusTone[record.status]}
          />
          <CardBody>
            <p className="reference-code text-sm font-bold">{record.referenceCode}</p>
            <p className="mt-2 text-sm text-foreground-muted">{studentClaim.intro}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {treatmentChips.map((chip) => (
                <li key={chip.name}>
                  <Chip icon={<CheckIcon className="size-3.5" />}>{chip.name}</Chip>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* The contact window only governs a case still waiting to be contacted.
            Leaving it up after the patient confirmed would tell a student to
            hurry towards a deadline that no longer applies to them. */}
        {record.status === 'MATCHED' ? (
          <Card className={record.isPastContactDeadline ? 'border-danger' : ''} tone="accent">
            <CardBody>
              <p className="text-xs text-foreground-muted">{studentClaim.deadlineLabel}</p>
              <p className="mt-1 text-sm font-bold">
                {record.isPastContactDeadline
                  ? studentClaim.deadlinePassed
                  : formatCaseDateTime(record.contactDeadlineAt)}
              </p>
              <p className="mt-2 text-xs text-foreground-muted">{studentClaim.deadlineHint}</p>
            </CardBody>
          </Card>
        ) : null}

        {/* The number, and what to say. This is the whole point of the screen:
            everything above it is context and everything below is what happens
            after the call. */}
        <Card className="mt-4">
          <CardBody>
            <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
              <PhoneIcon className="text-accent" />
              {studentClaim.phoneLabel}
            </p>
            {/* tel: so one tap dials — this screen exists to produce a phone call. */}
            <a
              href={`tel:${record.patientPhone}`}
              className="ltr-run mt-1 block text-2xl font-bold text-accent"
            >
              {formatPhoneForDisplay(record.patientPhone)}
            </a>
            <p className="mt-3 rounded-md bg-accent-muted p-3 text-xs text-foreground">
              {studentClaim.callAdvice}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-foreground">
              <AlertIcon className="mt-0.5 text-warm" />
              <span>{studentClaim.phonePrivacy}</span>
            </p>
          </CardBody>
        </Card>

        {/* One step at a time: the case's own status decides what comes next,
            so a student is never shown an action the lifecycle would refuse. */}
        {record.status === 'MATCHED' ? (
          <AssertContact
            caseId={caseId}
            alreadyAsserted={record.contactAsserted}
            confirmed={record.contactConfirmed}
          />
        ) : null}

        {record.status === 'CONTACTED' ? (
          <AppointmentStep caseId={caseId} isReschedule={false} />
        ) : null}

        {record.status === 'APPOINTMENT_CONFIRMED' && appointment ? (
          <>
            <Card tone="accent" className="mt-4">
              <CardBody>
                <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <CalendarIcon className="text-accent" />
                  {studentLifecycle.appointmentSetTitle}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatAppointment(appointment.scheduledFor)}
                </p>
              </CardBody>
            </Card>

            {remainingForOtherStage.length > 0 ? (
              <RemainderStep caseId={caseId} remaining={remainingForOtherStage} />
            ) : null}

            <OutcomeStep caseId={caseId} />

            <AppointmentStep
              caseId={caseId}
              isReschedule
              currentValue={toBaghdadInputValue(appointment.scheduledFor)}
            />
          </>
        ) : null}

        {/* Only while the student still has a live phone number in front of them.
            After an appointment exists the case has a patient who confirmed
            contact, and a wrong number is no longer the explanation. */}
        {record.status === 'MATCHED' || record.status === 'CONTACTED' ? (
          <WrongNumberReport caseId={caseId} />
        ) : null}

        <CasePhotoGrid photos={photos} label={photoCopy.studentLabel} />

        <Card className="mt-4">
          <CardBody className="py-0">
            <dl>
              <Row icon={<UserIcon />} label={studentClaim.nameLabel} value={record.patientName} />
              <Row icon={<CalendarIcon />} label={studentClaim.daysLabel} value={days} />
              {record.notes ? (
                <Row icon={<NoteIcon />} label={studentClaim.notesLabel} value={record.notes} />
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <div className="mt-6">
          <ButtonLink href="/student" variant="quiet" className="text-sm">
            {studentClaim.backToQueue}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}
