# سنون / SNOON — Project Guide

Arabic-first platform connecting Iraqi dental patients who need accessible treatment with
4th- and 5th-year dental students who need supervised clinical cases for their university
requirements. Treatment happens at the university clinic, under university supervision.
سنون matches people; it does not deliver care and does not employ anyone.

**Brand name:** Arabic `سنون` (primary, no diacritics — no shadda), Latin `SNOON`
(secondary). Never write `سَنّون`; that is a different word.

---

## Non-negotiables

Violating any of these is a bug, not a style preference.

1. **A case can never be claimed twice.** Enforced by the database, not by UI state.
2. **Patient contact details are invisible until a student holds an active claim.** Enforced
   in the data-access layer, not by hiding fields in the UI.
3. **Only verified students see cases.** Verification status is checked server-side on
   every case query.
4. **Arabic is the product.** RTL is the default direction, not a mode.
5. **No SMS or OTP anywhere.** It costs money per message and is excluded across all of
   Haider's projects. Design every flow without it.
6. **Data minimisation.** Do not collect health information because it is technically
   possible. Every new field on a patient record needs a reason.
7. **The app must work on a low-end Android phone on a slow connection.** This is the
   median user, not an edge case.

---

## Stack

House stack — already decided, do not re-litigate:

- **Next.js** (App Router) + **TypeScript**
- **Payload CMS 3**, co-located, using the Local API
- **Drizzle ORM** for application data
- **PostgreSQL**
- **Better Auth** for authentication
- **Tailwind 4** + **shadcn/ui built on Base UI** (never Radix)
- Self-hosted via **Dokploy** on the existing AWS EC2 instance (eu-north-1)

Explicitly excluded: `@payloadcms/plugin-ecommerce`, SMS/OTP providers, Radix primitives.

### Dual-schema pattern

This is the core architectural decision and it maps unusually well onto this product.

**Payload owns configuration and editorial data** — the things an administrator must be able
to change without a deployment:

- cities
- universities and their colleges/clinics
- academic stages (4th year, 5th year, …)
- treatment types
- clinic schedules (which stage, which days, which hours, at which clinic)
- treatment capability per stage per clinic — **this now decides what a student can see**,
  not merely what they may do, so an incomplete mapping silently hides cases
- static pages, FAQ, announcements, Arabic copy blocks

**Drizzle owns transactional and user-generated data** — the things with invariants:

- patients and submitted cases
- students, their profiles and verification records
- claims
- appointments
- case event log (audit trail)

Keep them in **separate Postgres schemas** — `payload`, `snoon`, and `auth` for Better
Auth. Application code reads Payload config through the Local API and joins by stable IDs.
Never write case or claim data through Payload.

The join key is each config document's **`slug`**, not Payload's numeric id. A case stores
`city_id` and `treatment_type_ids` as plain text in another schema, so the key has to stay
readable in the database and survive the config being edited, re-seeded or restored.

`src/lib/config/` is split along the client/server line and must stay that way.
`schema.ts` holds types and the fixed week and is safe for a Client Component;
`index.ts` reads Payload and is marked `server-only`, because importing it from a
Client Component pulls `fs`, `child_process` and the whole CMS into the browser
bundle and fails the build.

Any page rendering Payload config needs **both** a time-based `revalidate` and an
`afterChange`/`afterDelete` hook calling `revalidatePath`. Without the hook an admin who
adds a city sees nothing change and reasonably concludes the admin is broken; without the
`revalidate` a change made outside the admin never lands at all.

---

## Domain model

A **patient** submits a **case**: city, one or more treatments wanted, the clinic days they
can attend, contact details, optional intraoral photographs, free-text notes.

A patient often needs several things at once, so treatment is a **set**, not a single value —
a student matches on any overlap with what their stage may treat. Availability is days only:
clinic sessions run in the morning, so there is no time-of-day question, and Friday is never
offered because it is always a holiday. Session times belong to the Payload-managed clinic
schedule, not to a patient's case.

A **student** belongs to a university, a college/clinic and a stage, and has a verification
status. A verified student sees cases that match their clinic's location and their stage's
treatment capability, and may **claim** one.

A **claim** binds one student to one case. On successful claim — and only then — the
student can see the patient's contact details and is expected to make contact.

Cases are presented as **clinical cases**, never as a list of people. Use language like
`حالة علاجية متاحة`. The interface must not feel like students are shopping for patients:
no "browse patients", no photos of faces in listings, no ranking of people.

---

## Case lifecycle

```
REQUESTED ──claim──> MATCHED ──student confirms contact──> CONTACTED
    ▲                   │                                      │
    │                   │ contact window expires               │ appointment set
    │                   ▼                                      ▼
    └──── RETURNED_TO_QUEUE ◀── NO_CONTACT          APPOINTMENT_CONFIRMED
                                                               │
                                              ┌────────────────┼────────────┐
                                              ▼                ▼            ▼
                                         COMPLETED         NO_SHOW      CANCELLED
```

Also: `EXPIRED` for cases that sit in `REQUESTED` past their useful life.

Rules:

- Every transition is written to the case event log with actor, timestamp and reason.
- Transitions are validated server-side against an explicit allowed-transitions map. Never
  let a client send an arbitrary target state.
- `RETURNED_TO_QUEUE` restores the case to `REQUESTED` and records the failed claim, so the
  same student is not offered it again immediately.
- The patient must have a way to confirm whether contact actually happened. The student's
  word alone does not advance `MATCHED → CONTACTED` in a way that hides the case forever.

### The contact window

After claiming, the student has a limited window to contact the patient. **Start at 48
hours, not 24** — students are in clinic during the day and patients may not answer first
try. Make it a Payload-configurable setting, not a constant.

Expiry runs as a scheduled job, not a cron of one-off timers. Compute from
`claims.created_at`; never rely on a timer surviving a deploy.

### Claiming must be atomic

The claim is a conditional update inside a transaction:

```sql
UPDATE cases
   SET status = 'MATCHED'
 WHERE id = $1
   AND status = 'REQUESTED'
```

If `rowCount === 0`, someone else got there first — return a clean "this case is no longer
available" to the user. Insert the claim row in the same transaction.

Add a partial unique index as a second line of defence:

```sql
CREATE UNIQUE INDEX one_active_claim_per_case
    ON claims (case_id) WHERE status = 'active';
```

Do not implement this check by reading, then deciding, then writing.

---

## Access control

Write dedicated data-access functions per audience. **Never `select *` on cases in a
student-facing path**, and never rely on the UI to omit a field.

| Field | Anonymous | Verified student, unclaimed | Claimant | Admin |
|---|---|---|---|---|
| case reference code | – | ✓ | ✓ | ✓ |
| city / clinic | – | ✓ | ✓ | ✓ |
| treatment needed | – | ✓ | ✓ | ✓ |
| availability | – | ✓ | ✓ | ✓ |
| clinical notes | – | ✓ | ✓ | ✓ |
| intraoral photos | – | ✓ (protected) | ✓ | ✓ |
| patient name | – | ✗ | ✓ | ✓ |
| phone / contact | – | ✗ | ✓ | ✓ |

Suggested shape: `listCasesForStudent()` returns a narrow projection type that structurally
cannot contain contact fields; `getCaseForClaimant()` is the only function that returns them
and it takes the claim as an argument. Let TypeScript enforce it.

---

## Privacy rules

**Photographs.** Patients may upload intraoral images.

- Strip EXIF on upload (`sharp`: rotate to bake orientation, then re-encode without metadata).
- Re-encode to WebP, cap dimensions, cap file size.
- Store outside the public directory. Serve through an authenticated route that re-checks
  authorisation on every request. Never a guessable public URL.
- The upload UI must warn, in Arabic, not to include the face.
- Admins can remove any image.
- Delete images a configurable period after the case reaches a terminal state.

**Contact data.** Phone numbers are the most sensitive field in the system. They exist to be
shown to exactly one student. Do not log them, do not put them in error messages, do not
include them in any list endpoint.

---

## Authentication

**Students:** Better Auth with email and password. Email verification by link.

Then a manual verification step, because university email is not reliably available in Iraq:
the student uploads proof of enrolment (student ID or registration document), and an admin
reviews it in the Payload admin. Status is `pending | verified | rejected | suspended`.
Only `verified` sees cases. Manual review is correct at this scale — do not build automated
document checking.

Sign-up does not reveal whether an address is already registered: Better Auth accepts the
request and quietly does nothing, so the form cannot be used to enumerate accounts. It also
creates no session while email verification is required. Both shape the flow — sign-up
redirects to a "check your email" page that also tells a student who already has an account
to log in instead, which covers the dead end without adding an oracle.

Email itself is **not configured**, and this blocks student sign-up in production.

`src/lib/email.ts` prints to the console in development and throws in production. Throwing is
NOT sufficient on its own: Better Auth sends its verification email as a **background task**,
so the failure never reaches the caller. Sign-up appeared to succeed, the account row was
written, no message went out, and the student was left holding an account they could never
verify or log into — silently. Verified by probing it.

So any flow that depends on a message arriving must check `isEmailConfigured()` **before**
writing anything. Sign-up does, and refuses with an Arabic "registration is not open yet"
notice rather than creating an unverifiable account. `tests/email-guard.test.ts` holds that
line.

Sending real mail costs money or needs an account: SES is the obvious choice given the AWS
instance already in use, Resend the simpler one. Until one is implemented in `sendEmail`,
`isEmailConfigured()` returns false in production and student registration stays closed —
the patient side is unaffected and works fully.

**Patients:** no account at MVP. Friction here directly costs the people the platform exists
to serve.

A submitted case returns a **case reference code** plus a signed tracking link the patient
can bookmark, letting them check status and confirm contact without logging in. Tracking
tokens are long, random, single-case scoped, and revocable.

---

## Arabic and RTL

- `<html dir="rtl" lang="ar">` is the default. LTR is the exception.
- **Tailwind logical properties only** — `ms/me/ps/pe/start/end`. Never `ml/mr/pl/pr/left/right`.
- Western digits (`1234`), with `د.ع` as the currency suffix where money appears.
- All user-facing copy in Iraqi-appropriate Arabic, held in one place, not scattered as
  string literals through components. Copy is not final — treat it as data.
- Test with real Arabic content. Latin placeholder text hides RTL layout bugs.
- Numerals, dates and phone numbers need explicit direction handling inside RTL paragraphs.

---

## UI conventions

- shadcn/ui on Base UI. Check an existing component before adding a dependency.
- Mobile-first. Design the narrow viewport, then widen.
- Server Components by default; Client Components only where interaction requires it.
- **A rejected form must never empty itself.** React 19 resets a form after an action runs,
  back to each input's *default*, so an action that fails validation has to hand the
  submitted values back and the inputs must render them as `defaultValue` / `defaultChecked`.
  A `<select>` additionally needs a `key` tied to the value — React re-applies a changed
  `defaultValue` to a text input but not to a mounted select. Losing a filled-in case form
  over one mistyped digit is where a patient on a slow phone gives up.
- The student dashboard is a **tool**, not an experience. Repeat visitors need speed and
  density: fast filtering, clear case status, minimal chrome. Visual novelty here is a cost.
- Do not invent brand colours or pick fonts. The visual identity is still being decided.
  Use CSS custom properties with placeholder values in one tokens file so the identity can
  drop in later without touching components.

### The landing page

A cinematic 3D clinic scene is described in the product vision. **It is not in the MVP.**
It is the single most expensive, slowest, most performance-risky part of the plan, and it
sits in front of a product whose value is matching patients to students. Build a fast,
warm, Arabic-first landing page with three clear entry points — patient, student, supplies —
and revisit the cinematic entrance in v2 once matching works.

If asked to build it anyway, raise the performance cost on low-end Android first.

---

## Notifications — Telegram bot

Notifications go through a **Telegram bot**, for both patients and students. Telegram is
free to send on, which is the whole point: it gives the platform a push channel without the
per-message cost that rules out SMS.

Shape:

- Each audience gets a "turn on notifications" link that opens the bot with a deep-link
  payload (`https://t.me/<bot>?start=<payload>`), binding that chat to their case or their
  student account. The payload is single-use and scoped, like the tracking token.
- Opting in is optional. Nothing in the product may *require* Telegram — a patient without
  it must still be reachable by phone, and must still be able to use the tracking link.
- The bot is also an input channel, not just an output one. It is the most promising answer
  to the patient-confirmation problem: the bot can ask the patient "did a student contact
  you?" and take a yes/no, which advances `MATCHED → CONTACTED` on the patient's word rather
  than the student's.
- Bot tokens are secrets; they live in the environment, never in the repo.
- This does not weaken the no-SMS rule — it is what replaces SMS.

Not built yet. When it is, the send path belongs behind an interface so a case status change
does not know or care which channel carried it.

---

## Future: the supplies store

A dental products marketplace is planned for later — oral hygiene products for patients,
instruments and materials for students and dentists. The intended model is commission-based:
supplier lists, customer orders, supplier fulfils, سنون takes a cut. **No owned inventory.**

For now:

- Do not build it.
- Do not install `@payloadcms/plugin-ecommerce` — it is excluded.
- Leave room for it: keep the third landing entry point in the navigation model, keep
  product/supplier concerns out of the case domain, and do not make assumptions in the auth
  or user model that would block a customer who is neither a patient nor a student.

When it arrives it will be a custom build in the Drizzle schema, with prices as integers in
IQD and `د.ع` formatting.

---

## Not in the MVP

Do not build these unless explicitly asked:

- the 3D/WebGL landing scene
- in-app chat between student and patient (they will use the phone)
- payments of any kind
- the marketplace
- automated verification of student documents
- ratings or reviews of students
- bidding, pricing, or any competitive mechanism between students
- a mobile app
- multi-language switching (Arabic only for now)
- push notifications

---

## Open decisions — ask, do not assume

These are genuinely unresolved. If a task depends on one, stop and ask rather than picking.

1. **Fair distribution.** Should a student who has already received several cases through
   سنون be deprioritised? Tracking is worth building; the policy is not decided.
2. **External cases.** Students also find patients outside سنون. Self-reported external
   counts should be visibly marked as unverified and should not gate eligibility — but
   whether to collect them at all is open.
3. ~~**Case visibility scope.**~~ **Decided:** a student sees only cases whose treatments
   their stage is permitted to perform at their clinic. They never open a case they cannot
   take. The consequence to watch: a wrong capability mapping makes cases invisible rather
   than merely inconvenient, so the mapping is admin-editable in Payload and worth auditing
   against cases that sit unclaimed. `listOpenCasesForStudent` already takes the scope as an
   explicit filter, so this is a call-site policy, not a data-layer change.
4. **Patient confirmation mechanism.** How the patient confirms contact happened, without
   an account and without SMS. Leading candidate: the Telegram bot asks them directly. Still
   open is what happens for a patient who never opts in — the tracking link can carry a
   confirm button, but an unanswered case must not stall forever.
5. **Photo requirement.** Optional at submission — but should some treatments require them?
6. **University choice by the patient.** Raised and deliberately deferred, not rejected: after
   picking a city, should the patient narrow their case to particular universities they can
   actually reach? Transport across a city is the real obstacle in Iraq, so the information
   has value — but any filter here shrinks the pool of students who can see a case, so the
   leaning is optional-and-multi-select with "any" as the default, never required. Blocked on
   real data: which universities have dental colleges, and in which cities. Do not invent that
   list.
7. **Which cities to launch in.** The current 18-city list in `src/lib/config/index.ts` is a
   placeholder written by Claude, not a decision. Realistically the launch is one or two
   cities.
8. **Retention periods** for cases, photos and contact details after completion.

---

## Commands

```
pnpm dev            # local development, http://localhost:3000
pnpm build          # production build
pnpm start          # serve the production build
pnpm lint           # eslint (next/core-web-vitals + next/typescript)
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm test:watch     # vitest, watching
pnpm db:generate    # write a migration from src/db/schema.ts (cases, claims, auth)
pnpm db:migrate     # apply pending Drizzle migrations
pnpm payload:migrate    # apply pending Payload migrations
pnpm payload:seed       # seed cities, treatments and stages (idempotent)
pnpm payload:types      # regenerate src/payload/payload-types.ts
pnpm payload:importmap  # regenerate the admin import map
```

Run `payload:importmap` after adding or moving a collection, global or custom
admin component, and `payload:types` after changing any field.

### Local database

Development needs a PostgreSQL reachable at `DATABASE_URL`. Copy `.env.example`
to `.env.local` and fill it in; `.env.local` is gitignored and must never point at
a database holding real patient contact details.

```
service postgresql start
psql -c "CREATE USER snoon WITH PASSWORD '…' CREATEDB;"
createdb -O snoon snoon_dev
pnpm db:migrate
pnpm payload:migrate
pnpm payload:seed
```

The first admin is created by visiting `/admin`, which offers a create-first-user
form while no admin exists.

**`payload migrate` will prompt and hang if the database has been touched by
`pnpm dev`.** Payload's dev server pushes schema changes straight to the database,
which leaves migrations out of sync and makes the CLI stop for an interactive
confirmation. Stop the dev server, drop the `payload` schema and re-run the
migrations, so migrations stay the source of truth for deployment.

The database-backed tests in `tests/cases.db.test.ts` skip themselves when
`DATABASE_URL` is absent, so `pnpm test` still passes without Postgres — but the
access-control tests are the ones that matter most, so run them with a database
before pushing.

### Toolchain pins

- **ESLint 9, not 10.** `eslint-config-next` pulls in `eslint-plugin-react` 7.x,
  which uses the rule API ESLint 10 removed. Upgrading ESLint breaks `pnpm lint`.
- **TypeScript 6, not 7.** `typescript-eslint` 8.x refuses to load against the
  TS 7 API. `tsc` itself is happy on 7; the linter is not.

Both are upstream compatibility gaps, not preferences. Revisit when the
respective plugins ship support.

---

## Working style

- Incremental. No large unreviewed generations, no full-schema-in-one-shot.
- Explain architectural decisions before implementing them; never change agreed architecture
  silently.
- Tests accompany anything touching claiming, state transitions, or access control. Those
  three are where a bug harms a real person.
- Be direct about what costs money, needs approval, or is not possible.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
