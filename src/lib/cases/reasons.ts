/**
 * The reasons written to the case event log, in one place.
 *
 * These strings are stored in the database, so they are effectively an API:
 * rows written months ago still carry the exact text used then. That is why they
 * are constants rather than literals scattered through the writers — changing a
 * literal in one file would silently split the history in two, and the admin's
 * Arabic rendering of it would fall back to English for half the rows.
 *
 * They are stored in English because they are internal, machine-written and
 * never shown to a patient or a student. The admin is Arabic, so
 * `describeReason` translates them for display — matching by prefix, since an
 * outcome reason may have the student's own note appended to it.
 */

export const CASE_REASON = {
  SUBMITTED: 'Case submitted by patient.',
  CLAIMED: 'Case claimed by student.',
  CONTACT_ASSERTED: 'Student reported making contact; awaiting the patient to confirm.',
  CONTACT_CONFIRMED: 'Patient confirmed a student made contact.',
  NO_CONTACT_REPORTED: 'Patient reported that no student had contacted them yet.',
  APPOINTMENT_AGREED: 'Appointment agreed with the patient.',
  APPOINTMENT_RESCHEDULED: 'Appointment rescheduled by the student.',
  COMPLETED: 'Treatment completed.',
  NO_SHOW: 'Patient did not attend the appointment.',
  CANCELLED: 'Appointment cancelled.',
  CONTACT_WINDOW_EXPIRED: 'Contact window expired without contact.',
  RETURNED_TO_QUEUE: 'Returned to the queue for another student.',
  UNCLAIMED_TOO_LONG: 'Case sat unclaimed past its useful life.',
  WRONG_NUMBER: 'The person reached never asked for treatment; number put on cooldown.',
} as const

export type CaseReason = (typeof CASE_REASON)[keyof typeof CASE_REASON]

/** What an admin reads instead. Same keys, one to one. */
export const CASE_REASON_AR: Record<CaseReason, string> = {
  [CASE_REASON.SUBMITTED]: 'المريض قدّم الحالة.',
  [CASE_REASON.CLAIMED]: 'طالب حجز الحالة.',
  [CASE_REASON.CONTACT_ASSERTED]: 'الطالب گال إنه اتصل، وننتظر تأكيد المريض.',
  [CASE_REASON.CONTACT_CONFIRMED]: 'المريض أكّد إنه وصله اتصال.',
  [CASE_REASON.NO_CONTACT_REPORTED]: 'المريض گال إنه ما وصله اتصال لحد الآن.',
  [CASE_REASON.APPOINTMENT_AGREED]: 'انتفق على موعد ويّا المريض.',
  [CASE_REASON.APPOINTMENT_RESCHEDULED]: 'الطالب غيّر الموعد.',
  [CASE_REASON.COMPLETED]: 'العلاج خلص.',
  [CASE_REASON.NO_SHOW]: 'المريض ما حضر بالموعد.',
  [CASE_REASON.CANCELLED]: 'الموعد انلغى.',
  [CASE_REASON.CONTACT_WINDOW_EXPIRED]: 'مهلة التواصل خلصت بدون تواصل.',
  [CASE_REASON.RETURNED_TO_QUEUE]: 'رجعت للقائمة حتى ياخذها طالب ثاني.',
  [CASE_REASON.UNCLAIMED_TOO_LONG]: 'كعدت بالقائمة بدون ما ياخذها أحد.',
  [CASE_REASON.WRONG_NUMBER]: 'الطالب بلّغ إن صاحب الرقم ما طلب علاج. الرقم انوقف مؤقتاً.',
}

/**
 * An event reason as an admin should read it.
 *
 * Returns the Arabic sentence plus whatever the writer appended — a student's
 * free-text note on an outcome, which is the patient's or student's own words and
 * is never rewritten. Unknown text comes back untouched rather than being hidden:
 * an audit trail that quietly drops what it cannot translate is worse than one
 * that shows English.
 */
export function describeReason(reason: string): { text: string; note: string | null } {
  for (const [english, arabic] of Object.entries(CASE_REASON_AR)) {
    if (reason === english) return { text: arabic, note: null }
    if (reason.startsWith(`${english} `)) {
      return { text: arabic, note: reason.slice(english.length + 1) }
    }
  }
  return { text: reason, note: null }
}
