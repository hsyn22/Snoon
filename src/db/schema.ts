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

export const casesRelations = relations(cases, ({ many }) => ({
  events: many(caseEvents),
}))

export const caseEventsRelations = relations(caseEvents, ({ one }) => ({
  case: one(cases, { fields: [caseEvents.caseId], references: [cases.id] }),
}))

export type CaseRow = typeof cases.$inferSelect
export type NewCaseRow = typeof cases.$inferInsert
export type CaseEventRow = typeof caseEvents.$inferSelect

/** Kept for migrations that need raw SQL alongside the schema. */
export { sql }
