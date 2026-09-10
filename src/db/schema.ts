import { relations, sql } from 'drizzle-orm'
import {
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Drizzle owns transactional and user-generated data — the things with
 * invariants. Payload owns configuration (cities, universities, stages,
 * treatment types) and lives in its own Postgres schema. Keeping them apart at
 * the schema level means a Payload migration can never rewrite a case, and the
 * join between the two is always by stable ID, never by foreign key.
 */
export const snoon = pgSchema('snoon')

/** The case lifecycle from CLAUDE.md. Transitions are validated in code against
 *  an explicit allowed-transitions map — this enum only says what can be stored. */
export const caseStatus = snoon.enum('case_status', [
  'REQUESTED',
  'MATCHED',
  'CONTACTED',
  'APPOINTMENT_CONFIRMED',
  'COMPLETED',
  'NO_CONTACT',
  'RETURNED_TO_QUEUE',
  'NO_SHOW',
  'CANCELLED',
  'EXPIRED',
])

/** Who caused an event. `SYSTEM` covers scheduled jobs such as contact-window expiry. */
export const actorType = snoon.enum('actor_type', ['PATIENT', 'STUDENT', 'ADMIN', 'SYSTEM'])

/**
 * Student verification. University email is not reliably available in Iraq, so a
 * student uploads proof of enrolment and an admin reviews it by hand. Only
 * VERIFIED sees cases — checked server-side on every case query, never inferred
 * from a session flag.
 */
export const verificationStatus = snoon.enum('verification_status', [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED',
])

/**
 * A claim's life. ACTIVE is the only state that grants sight of contact details,
 * and only one ACTIVE claim may exist per case — enforced by a partial unique
 * index, not by application logic.
 */
export const claimStatus = snoon.enum('claim_status', [
  'ACTIVE',
  'COMPLETED',
  'RELEASED',
  'EXPIRED',
])

export const cases = snoon.table(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * Short, human-readable, unambiguous. The patient reads this out or types it
     * to find their case. Not a secret — it identifies a case, it does not grant
     * access to one.
     */
    referenceCode: text('reference_code').notNull(),

    status: caseStatus('status').notNull().default('REQUESTED'),

    /**
     * Stable IDs into Payload-managed configuration. Deliberately not foreign
     * keys: the config lives in another schema, managed by another tool, and a
     * city being renamed or retired must never cascade into a patient's case.
     */
    cityId: text('city_id').notNull(),

    /**
     * One or more treatments the patient wants. A patient often needs several
     * things at once, and a student matches on any overlap with what their stage
     * is allowed to treat — so this is a set, not a single value.
     */
    treatmentTypeIds: text('treatment_type_ids').array().notNull(),

    /**
     * Clinic days the patient can attend, as 'sat' … 'thu'. Friday is a holiday
     * and is never offered. There is no time-of-day column: clinic sessions run
     * in the morning, and session times belong to the Payload-managed clinic
     * schedule rather than to a patient's case.
     */
    availabilityDays: text('availability_days').array().notNull(),

    /**
     * Contact details. The most sensitive columns in the system: they exist to be
     * shown to exactly one student, after that student holds an active claim.
     * Never select these in a list query, never log them, never put them in an
     * error message. See src/db/queries/cases.ts — no student-facing function
     * returns them.
     */
    patientName: text('patient_name').notNull(),
    patientPhone: text('patient_phone').notNull(),

    /** Free-text from the patient. Not a clinical record — see data minimisation. */
    notes: text('notes'),

    /**
     * SHA-256 of the patient's tracking token, never the token itself. The token
     * is shown once, in the link handed to the patient at submission; if this
     * table leaks, the hashes do not let anyone open a case. Revoking sets
     * `trackingTokenRevokedAt` rather than deleting, so the audit trail survives.
     */
    trackingTokenHash: text('tracking_token_hash').notNull(),
    trackingTokenRevokedAt: timestamp('tracking_token_revoked_at', { withTimezone: true }),

    /**
     * When the contact details above were erased.
     *
     * A finished case does not need a phone number. It needs to still exist —
     * an admin has to be able to answer "what happened to SN-4KP7QW" months
     * later, and the event log is the only record of a case that went wrong —
     * but the name, number and free text are the parts that would harm someone
     * if this table ever leaked, and they have no remaining purpose.
     *
     * So the row is scrubbed rather than deleted, and marked, because a case
     * that had a patient must stay distinguishable from one whose details were
     * never filled in.
     */
    contactScrubbedAt: timestamp('contact_scrubbed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('cases_reference_code_key').on(table.referenceCode),
    uniqueIndex('cases_tracking_token_hash_key').on(table.trackingTokenHash),
    // The student-facing queue: open cases in a city, oldest first.
    index('cases_status_city_created_idx').on(table.status, table.cityId, table.createdAt),
    // Matching a student's stage capability against a case means asking whether
    // the treatment sets overlap, which needs a GIN index to stay fast.
    index('cases_treatment_type_ids_idx').using('gin', table.treatmentTypeIds),
  ],
)

/**
 * Append-only audit trail. Every status transition writes a row here with actor,
 * timestamp and reason — including transitions made by scheduled jobs. Rows are
 * never updated or deleted.
 */
export const caseEvents = snoon.table(
  'case_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),

    /** Null on the row that records the case being created. */
    fromStatus: caseStatus('from_status'),
    toStatus: caseStatus('to_status').notNull(),

    actorType: actorType('actor_type').notNull(),
    /** The student or admin who acted. Null for PATIENT and SYSTEM actors. */
    actorId: text('actor_id'),

    /** Why, in a form a human reviewing the trail can read. Never contains contact details. */
    reason: text('reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('case_events_case_id_created_idx').on(table.caseId, table.createdAt)],
)

/**
 * Intraoral photographs attached to a case.
 *
 * The file itself lives in Payload — that is what gives an admin a viewer and a
 * delete button. This table owns the relationship and the lifecycle, because
 * those have rules: photographs are deleted a configurable period after the case
 * reaches a terminal state, and a deletion has to be recorded rather than the row
 * simply vanishing.
 */
export const casePhotos = snoon.table(
  'case_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),

    /** The Payload media document id holding the processed WebP. */
    mediaId: text('media_id').notNull(),

    /** Set when the file has actually been removed from storage. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedReason: text('deleted_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('case_photos_case_idx').on(table.caseId, table.createdAt),
    uniqueIndex('case_photos_media_key').on(table.mediaId),
  ],
)

export const appointments = snoon.table(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** The claim under which this appointment was arranged. */
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),

    /**
     * The appointment instant, stored with its zone.
     *
     * The student enters a wall-clock time, which is interpreted as Baghdad time
     * rather than the device's — a phone set to another zone must not book a
     * patient three hours out. See `src/lib/dates.ts`.
     */
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),

    /** Set when superseded by a reschedule, so the history is not overwritten. */
    supersededAt: timestamp('superseded_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // At most one live appointment per case; a reschedule supersedes rather than
    // replacing, so a patient cannot be shown two times at once.
    uniqueIndex('one_live_appointment_per_case')
      .on(table.caseId)
      .where(sql`superseded_at is null`),
    index('appointments_scheduled_idx').on(table.scheduledFor),
  ],
)

/**
 * Who a Telegram chat belongs to. A patient is bound to one case; a student is
 * bound to their account.
 */
export const telegramSubjectType = snoon.enum('telegram_subject_type', ['PATIENT_CASE', 'STUDENT'])

export const students = snoon.table(
  'students',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * The Better Auth user this profile belongs to. Auth owns credentials, email
     * and sessions; this table owns who the student is academically. Text rather
     * than a foreign key because the auth tables are managed by another tool.
     */
    authUserId: text('auth_user_id').notNull(),

    fullName: text('full_name').notNull(),

    /** Stable IDs into Payload-managed configuration, as on cases. */
    universityId: text('university_id').notNull(),
    collegeId: text('college_id').notNull(),
    stageId: text('stage_id').notNull(),

    verificationStatus: verificationStatus('verification_status').notNull().default('PENDING'),

    /**
     * Path to the uploaded proof of enrolment. Stored outside the public
     * directory and served only through an authenticated route — never a
     * guessable URL. Null until the student uploads one.
     */
    verificationDocumentPath: text('verification_document_path'),
    verificationReviewedBy: text('verification_reviewed_by'),
    verificationReviewedAt: timestamp('verification_reviewed_at', { withTimezone: true }),
    /** Admin-facing note, e.g. why a document was rejected. Never shown verbatim to patients. */
    verificationNote: text('verification_note'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('students_auth_user_id_key').on(table.authUserId),
    // The student-facing queue is filtered by verification first, then by where
    // the student actually studies.
    index('students_verification_college_idx').on(table.verificationStatus, table.collegeId),
  ],
)

export const claims = snoon.table(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),

    status: claimStatus('status').notNull().default('ACTIVE'),

    /**
     * When the student must have made contact by. Computed from createdAt plus
     * the Payload-configurable contact window (48 hours to start), and stored so
     * the expiry job is a plain indexed query rather than a timer that would not
     * survive a deploy.
     */
    contactDeadlineAt: timestamp('contact_deadline_at', { withTimezone: true }).notNull(),

    /**
     * When the student said they had reached the patient.
     *
     * Recorded, but it does NOT advance the case on its own: the student's word
     * alone must not be able to hide a case forever. It exists so the patient can
     * be asked to confirm, and so an admin can see who claimed what and said what.
     */
    contactAssertedAt: timestamp('contact_asserted_at', { withTimezone: true }),

    releasedAt: timestamp('released_at', { withTimezone: true }),
    /** Why the claim ended. Read by the queue so a student is not re-offered a case they lost. */
    releaseReason: text('release_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * The second line of defence behind the conditional update: even if two
     * requests somehow both passed the status check, the database refuses the
     * second ACTIVE claim. This is what makes "a case can never be claimed twice"
     * a database guarantee rather than a hope.
     */
    uniqueIndex('one_active_claim_per_case')
      .on(table.caseId)
      .where(sql`status = 'ACTIVE'`),
    index('claims_student_created_idx').on(table.studentId, table.createdAt),
    // The expiry job: ACTIVE claims past their deadline.
    index('claims_status_deadline_idx').on(table.status, table.contactDeadlineAt),
  ],
)

/**
 * Telegram chat bindings.
 *
 * Notifications replace SMS, which costs money per message. A person opts in by
 * opening a deep link that carries a single-use invite token; the bot receives
 * that token on /start and binds the chat.
 *
 * The invite token is stored as an HMAC, never in plaintext, exactly as patient
 * tracking tokens are: the link is a credential, and anyone holding it could
 * otherwise attach their own chat to somebody else's case. Opting in is always
 * optional — nothing in the product may require Telegram.
 */
/**
 * Phone numbers that may not submit a new case for a while.
 *
 * Patients have no account, so nothing stops someone entering another person's
 * number — and the first that person hears of it is a dental student ringing
 * about treatment they never asked for. There is no free way to prove ownership
 * of a phone number: an SMS code is exactly what this project excludes, and it
 * costs money per message. So the answer is not verification but a fast, cheap
 * stop: the student who makes that call reports it, and the number is put beyond
 * use here.
 *
 * The cooldown is on the *victim's* number, which is uncomfortable and still
 * right — it is the only handle that stops the same submission being made again
 * an hour later. It is temporary, an admin can lift it, and the message shown to
 * whoever next tries to use that number explains what happened and how to reach
 * سنون. That message is aimed at the real owner: if they ever come to سنون
 * themselves, they learn why rather than being silently refused.
 *
 * Deliberately NOT recorded here: the submitter's IP address. It would be the
 * only handle on the person actually responsible, and it is not worth logging
 * every patient's address for a rare event. Volume is already capped per address
 * by the rate limiter, without storing anything.
 */
export const phoneBlocks = snoon.table(
  'phone_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Normalised to 07XXXXXXXXX, as cases store it. */
    phone: text('phone').notNull(),

    /** Why, for the admin deciding whether to lift it. Never shown to the public. */
    reason: text('reason').notNull(),

    /** The case whose claimant reported it. Null for a block an admin created. */
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),

    blockedUntil: timestamp('blocked_until', { withTimezone: true }).notNull(),

    /** Set rather than deleting, so lifting a block stays auditable. */
    liftedAt: timestamp('lifted_at', { withTimezone: true }),
    liftedBy: text('lifted_by'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // The submission check: is there a live block on this number right now.
    index('phone_blocks_phone_until_idx').on(table.phone, table.blockedUntil),
  ],
)

export const telegramLinks = snoon.table(
  'telegram_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    subjectType: telegramSubjectType('subject_type').notNull(),
    /** A case id or a student id, depending on subjectType. Not a foreign key
     *  because it points at one of two tables. */
    subjectId: uuid('subject_id').notNull(),

    inviteTokenHash: text('invite_token_hash').notNull(),

    /** Null until the person actually opens the bot and presses start. */
    chatId: text('chat_id'),
    linkedAt: timestamp('linked_at', { withTimezone: true }),

    /** Set rather than deleting, so a revoked link stays auditable. */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('telegram_links_invite_token_hash_key').on(table.inviteTokenHash),
    // One live binding per subject: a second active link for the same case would
    // mean two chats both believing they speak for that patient.
    uniqueIndex('one_active_telegram_link_per_subject')
      .on(table.subjectType, table.subjectId)
      .where(sql`revoked_at is null`),
    index('telegram_links_chat_idx').on(table.chatId),
  ],
)

export const casesRelations = relations(cases, ({ many }) => ({
  events: many(caseEvents),
  claims: many(claims),
}))

export const studentsRelations = relations(students, ({ many }) => ({
  claims: many(claims),
}))

export const claimsRelations = relations(claims, ({ one }) => ({
  case: one(cases, { fields: [claims.caseId], references: [cases.id] }),
  student: one(students, { fields: [claims.studentId], references: [students.id] }),
}))

export const caseEventsRelations = relations(caseEvents, ({ one }) => ({
  case: one(cases, { fields: [caseEvents.caseId], references: [cases.id] }),
}))

export type CaseRow = typeof cases.$inferSelect
export type NewCaseRow = typeof cases.$inferInsert
export type CaseEventRow = typeof caseEvents.$inferSelect
export type StudentRow = typeof students.$inferSelect
export type NewStudentRow = typeof students.$inferInsert
export type ClaimRow = typeof claims.$inferSelect
export type TelegramLinkRow = typeof telegramLinks.$inferSelect
export type AppointmentRow = typeof appointments.$inferSelect
export type CasePhotoRow = typeof casePhotos.$inferSelect

/** Kept for migrations that need raw SQL alongside the schema. */
export { sql }
