import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCaseByTrackingToken, getCurrentAppointment } from '@/db/queries/cases'
import { listCasePhotos } from '@/db/queries/case-photos'
import { CasePhotoGrid } from '@/components/case-photo-grid'
import { Card, CardBody, CardRibbon, Chip, MetaRow, statusTone } from '@/components/ui/card'
import {
  AlertIcon,
  CalendarIcon,
  ClockIcon,
  NoteIcon,
  PhoneIcon,
  PinIcon,
  UserIcon,
} from '@/components/ui/icon'
import { PageShell } from '@/components/site-chrome'
import { ButtonLink } from '@/components/ui/button'
import { getAllTreatmentTypes, getCityById } from '@/lib/config'
import {
  caseForm,
  caseStatus,
  caseTracking,
  casePhotos as photoCopy,
  patientAccount,
  common,
  patientAppointment,
  patientConfirm,
} from '@/lib/copy'
import { formatAppointment, formatCaseDate } from '@/lib/dates'
import { formatPhoneForDisplay } from '@/lib/phone'
import { isTelegramConfigured } from '@/lib/telegram/config'
import { isSubjectLinked } from '@/db/queries/telegram'
import { pendingDaysForCase } from '@/db/queries/day-requests'
import { auth } from '@/lib/auth'
import { AttachCase } from './attach-case'
import { TelegramInvite } from './telegram-invite'
import { ConfirmContact } from './confirm-contact'
import { DayAnswer } from './day-answer'
import { hasPendingContactAssertion } from './confirm-queries'

/**
 * The patient's view of their own case, opened by the tracking token in the URL.
 *
 * Never cached and never indexed: the URL is the credential, so a cached copy or
 * a search-engine crawl of it would leak the case.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: caseTracking.statusLabel,
  robots: { index: false, follow: false, nocache: true },
}

/**
 * One of the patient's own answers, played back.
 *
 * These stay as a labelled list rather than becoming icon rows: this block is
 * "what you told us", and a patient checking their own phone number needs the
 * word رقم الهاتف beside it, not a pictogram they have to interpret.
 */
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

export default async function TrackCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { token } = await params
  const { new: isNew } = await searchParams

  const record = await getCaseByTrackingToken(token)

  if (!record) {
    return (
      <PageShell>
        <h1 className="text-2xl font-bold">{caseTracking.invalidTitle}</h1>
        <p className="mt-2 text-foreground-muted">{caseTracking.invalidBody}</p>
        <div className="mt-6">
          <ButtonLink href="/" variant="secondary">
            {common.backHome}
          </ButtonLink>
        </div>
      </PageShell>
    )
  }

  // The full list, not just the active one: a case submitted before a treatment
  // was retired must still show its Arabic name rather than a raw slug.
  const [city, allTreatments] = await Promise.all([
    getCityById(record.cityId),
    getAllTreatmentTypes(),
  ])

  // Resolve the stored IDs to Arabic names, keeping any unknown ID visible
  // rather than silently dropping a treatment the patient asked for.
  const treatments = record.treatmentTypeIds.map(
    (id) => allTreatments.find((treatment) => treatment.id === id)?.nameAr ?? id,
  )

  // Notifications are optional and the section is simply absent when no bot is
  // configured, rather than offering something that cannot work.
  // Only asked once a student has actually said they called — asking before that
  // would have the patient confirming something that has not happened.
  const awaitingConfirmation = await hasPendingContactAssertion(record.id)
  const appointment = await getCurrentAppointment(record.id)
  const photos = await listCasePhotos(record.id)

  const telegramAvailable = isTelegramConfigured()
  // Only while the case is still open: a claimed case is not going anywhere.
  const pendingDays =
    record.status === 'REQUESTED' ? await pendingDaysForCase(record.id) : []

  const patientLinked = telegramAvailable ? await isSubjectLinked({ type: 'PATIENT_CASE', id: record.id }) : false

  const headerList = await headers()

  /*
   * Whether to offer "keep this case in my account".
   *
   * Only to someone already signed in, and only when this case is not already
   * theirs. A patient without an account is shown nothing here — the link is the
   * product and an account is a convenience, and a sign-in prompt on the page
   * someone opens to check on their treatment reads as a demand.
   */
  const session = await auth.api.getSession({ headers: headerList })
  const ownedByViewer = Boolean(session && record.patientAuthUserId === session.user.id)
  const offerAttach = Boolean(session) && !record.patientAuthUserId

  const host = headerList.get('host') ?? ''
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  const trackingUrl = `${protocol}://${host}/case/track/${token}`

  const days = record.availabilityDays
    .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
    .map((day) => caseForm.weekDays[day])
    .join('، ')

  return (
    <PageShell>
      <>
        {isNew ? (
          <Card tone="accent" className="mb-4">
            <CardBody>
              <h1 className="text-xl font-bold">{caseTracking.successTitle}</h1>
              <p className="mt-2 text-sm">{caseTracking.successBody}</p>
            </CardBody>
          </Card>
        ) : null}

        {/* The status card. Everything a patient opens this page to find out is
            on it: where the case has got to, the code they read out on the
            phone, what they asked for, and when they can come. It used to be a
            code at the top and a status buried in a table at the bottom. */}
        <Card>
          <CardRibbon
            label={caseStatus[record.status]}
            detail={caseTracking.statusLabel}
            tone={statusTone[record.status]}
          />
          <CardBody>
            <p className="text-xs text-foreground-muted">{caseTracking.referenceLabel}</p>
            <p className="reference-code mt-1 text-2xl font-bold">{record.referenceCode}</p>
            <p className="mt-2 text-xs text-foreground-muted">{caseTracking.referenceHint}</p>

            <ul className="mt-4 flex flex-wrap gap-1.5">
              {treatments.map((name) => (
                <li key={name}>
                  <Chip>{name}</Chip>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5">
              <MetaRow icon={<PinIcon />} label={caseTracking.cityLabel}>
                {city?.nameAr ?? record.cityId}
              </MetaRow>
              <MetaRow icon={<CalendarIcon />} label={caseTracking.daysLabel}>
                {days}
              </MetaRow>
              <MetaRow icon={<ClockIcon />} label={caseTracking.submittedAtLabel}>
                {/* No direction wrapper: formatCaseDate spells the month in
                    Arabic, so the string is naturally RTL. Forcing LTR here is
                    what scrambled it. */}
                <span className="text-foreground-muted">{formatCaseDate(record.createdAt)}</span>
              </MetaRow>
            </div>
          </CardBody>
        </Card>

        {/* The appointment is the single most useful thing on this page once it
            exists, so it sits directly under the status. */}
        {appointment ? (
          <Card tone="accent" className="mt-4">
            <CardBody>
              <p className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <CalendarIcon className="text-accent" />
                {patientAppointment.label}
              </p>
              <p className="mt-1 text-base font-bold">
                {formatAppointment(appointment.scheduledFor)}
              </p>
              <p className="mt-2 text-xs text-foreground-muted">{patientAppointment.hint}</p>
            </CardBody>
          </Card>
        ) : null}

        {awaitingConfirmation ? <ConfirmContact trackingToken={token} /> : null}

        {/* Students are in clinic on the days their timetable says. When one
            could take this case on a day the patient did not pick, the patient
            is asked — here as well as in the bot, because Telegram is optional
            and every question the bot asks has to be answerable without it. */}
        {pendingDays.map((day) => (
          <DayAnswer key={day} trackingToken={token} day={day} />
        ))}

        {/* Rendered from the server, not from the form's own state: answering
            "yes" moves the case out of MATCHED, which unmounts the question —
            so without this the patient taps and the question simply disappears
            with nothing to show it worked. */}
        {record.status === 'CONTACTED' ? (
          <Card className="mt-4">
            <CardBody>
              <p className="text-sm">{patientConfirm.confirmed}</p>
            </CardBody>
          </Card>
        ) : null}

        {telegramAvailable ? (
          <TelegramInvite trackingToken={token} alreadyLinked={patientLinked} />
        ) : null}

        {offerAttach ? <AttachCase trackingToken={token} /> : null}
        {ownedByViewer ? (
          <p className="mt-4 text-xs text-foreground-muted">{patientAccount.linkedNote}</p>
        ) : null}

        <CasePhotoGrid photos={photos} label={photoCopy.patientLabel} trackingToken={token} />

        {/* The tracking link, below the case rather than above it. It is the
            credential and it matters, but it is not what someone opens the page
            to read — they are already holding it. */}
        <Card className="mt-4">
          <CardBody>
            <p className="text-xs text-foreground-muted">{caseTracking.linkLabel}</p>
            {/* break-all so a long token wraps instead of forcing the page to
                scroll sideways on a narrow phone. */}
            <p className="ltr-run mt-1 block break-all text-xs text-foreground">{trackingUrl}</p>
            <p className="mt-2 text-xs text-foreground-muted">{caseTracking.linkHint}</p>
            <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-foreground">
              <AlertIcon className="mt-0.5 text-warm" />
              <span>{caseTracking.linkWarning}</span>
            </p>
          </CardBody>
        </Card>

        {/* What the patient told us, played back so they can check it. */}
        <Card className="mt-4">
          <CardBody className="py-0">
            <h2 className="sr-only">{caseTracking.yourDetails}</h2>
            <dl>
              <Row icon={<UserIcon />} label={caseTracking.nameLabel} value={record.patientName} />
              <Row
                icon={<PhoneIcon />}
                label={caseTracking.phoneLabel}
                value={
                  <span className="ltr-run">{formatPhoneForDisplay(record.patientPhone)}</span>
                }
              />
              {record.notes ? (
                <Row icon={<NoteIcon />} label={caseTracking.notesLabel} value={record.notes} />
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </>
    </PageShell>
  )
}
