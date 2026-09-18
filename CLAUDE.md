# سنون / SNOON — Project Guide

Arabic-first platform connecting Iraqi dental patients who need accessible treatment with
4th- and 5th-year dental students who need supervised clinical cases for their university
requirements. Treatment happens at the university clinic, under university supervision.
**سنون matches people; it does not deliver care and does not employ anyone.**

That sentence is load-bearing. It is what keeps this out of medical liability, and it
survives only while nothing here tells a patient what is wrong with them.

**Haider is the product owner and a dentist. He is not a programmer.** Explain in plain
language, be direct about what costs money or needs his decision, and reply in Iraqi Arabic.
Clinical content is his call, never Claude's.

---

## Start here

| | |
|---|---|
| **Stack** | Next.js 16 (App Router) · TypeScript · Payload CMS 3 · Drizzle · PostgreSQL · Better Auth · Tailwind 4 |
| **Hosting** | Vercel, functions in `fra1` · Neon Postgres (Frankfurt) · Cloudflare R2 for uploads |
| **Live** | `snoon.vercel.app` — deployed from GitHub, **not** from Claude Code |
| **Tests** | `pnpm test` — 44 files, ~695 tests. Database-backed ones skip without `DATABASE_URL` |
| **Language** | Arabic, RTL by default. All copy in `src/lib/copy.ts` |

```
pnpm dev              # http://localhost:3000
pnpm build            # production build
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm test             # vitest run

pnpm db:generate      # write a Drizzle migration from src/db/schema.ts
pnpm db:migrate       # apply pending Drizzle migrations
pnpm payload:migrate  # apply pending Payload migrations
pnpm payload:seed     # seed cities, treatments, stages (idempotent, additive)
pnpm payload:types    # regenerate src/payload/payload-types.ts
pnpm payload:importmap # regenerate the admin import map
pnpm telegram:poll    # local stand-in for the Telegram webhook
```

Run `payload:importmap` after adding or moving a collection, global or custom admin
component, and `payload:types` after changing any field. **Both outputs are committed.**

### Repo map

```
src/app/(frontend)/      the site — patient and student pages
src/app/(payload)/       the Payload admin (its own root layout)
src/app/api/             cron, Telegram webhook, case photos, Better Auth
src/components/          shared UI; ui/ is the vocabulary, brand/ the artwork
src/db/schema.ts         Drizzle: cases, claims, students, appointments, events, reviews
src/db/queries/          one module per audience — the access-control boundary
src/lib/cases/           claiming, lifecycle, contact, reasons
src/lib/config/          Payload config readers (split three ways — see below)
src/lib/images/          photo processing, EXIF stripping, browser-side editing
src/lib/notifications/   channel-agnostic sending; Telegram registers itself
src/lib/triage/          the guided questions tree
src/payload/             collections, globals, migrations, custom admin views
docs/design.md           motion, landing page, competitors — reference, not rules
docs/incidents.md        what has broken and the rule each failure left behind
docs/roadmap.md          outstanding work, in order
docs/competitors.md      ClinMatch, AsnanLink, عالجني
```

### Routes

**Patient** (no account, ever): `/` · `/case/new` · `/case/guide` · `/case/track/[token]` ·
`/case/find` · `/case/mine` (optional Google account)
**Student**: `/student` (queue) · `/student/profile` · `/student/profile/document` ·
`/student/case/[caseId]` · `/student/history` · `/student/notifications` · login/signup
**Admin**: `/admin` plus three custom views — `/admin/cases`, `/admin/students`,
`/admin/reviews`

### Local setup

```
service postgresql start
psql -c "CREATE USER snoon WITH PASSWORD '…' CREATEDB;"
createdb -O snoon snoon_dev
cp .env.example .env.local     # gitignored; never point it at real patient data
pnpm db:migrate && pnpm payload:migrate && pnpm payload:seed
```

The first admin is created by visiting `/admin`, which offers a create-first-user form while
no admin exists.

**`payload migrate` will prompt and hang if the database has been touched by `pnpm dev`.**
Payload's dev server pushes schema changes straight to the database, which leaves migrations
out of sync. Stop the dev server, drop the `payload` schema, re-run the migrations — so
migrations stay the source of truth for deployment.

### Environment variables

Required: `DATABASE_URL`, `PAYLOAD_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`TRACKING_TOKEN_SECRET`, `CRON_SECRET`.
Optional, each all-or-nothing: `R2_ACCOUNT_ID` + `R2_BUCKET` + `R2_ACCESS_KEY_ID` +
`R2_SECRET_ACCESS_KEY` (uploads) · `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` +
`TELEGRAM_WEBHOOK_SECRET` (notifications) · `RESEND_API_KEY` + `EMAIL_FROM` (email) ·
`GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (sign-in).

**Three of four R2 variables means سنون behaves as though there were none**, deliberately: a
deployment that believes it has object storage and does not is worse than one that knows it
has none.

### Current state

Deployed and working: the patient side end to end, the student side, the admin, R2 uploads.
**Blocked:** password sign-up needs a verified Resend sending domain — until then Google
sign-in is the only way a student gets an account. **Not scheduled yet:** nothing drives
`/api/cron` until a cron is configured, so contact windows do not expire on their own.

### Toolchain pins

- **ESLint 9, not 10.** `eslint-config-next` pulls `eslint-plugin-react` 7.x, which uses the
  rule API ESLint 10 removed.
- **TypeScript 6, not 7.** `typescript-eslint` 8.x refuses to load against the TS 7 API.

Both are upstream gaps, not preferences.

---

## Non-negotiables

Violating any of these is a bug, not a style preference.

1. **A case can never be claimed twice.** Enforced by the database, not by UI state.
2. **Patient contact details are invisible until a student holds an active claim.** Enforced
   in the data-access layer, not by hiding fields in the UI.
3. **Only verified students see cases.** Checked server-side on every case query.
4. **Arabic is the product.** RTL is the default direction, not a mode.
5. **No SMS or OTP anywhere.** It costs money per message and is excluded across all of
   Haider's projects. Design every flow without it.
6. **Data minimisation.** Every new field on a patient record needs a reason.
7. **The app must work on a low-end Android phone on a slow connection.** This is the median
   user, not an edge case.

And two that emerged from real failures (`docs/incidents.md`):

8. **A rule that is only a rendering decision is not a rule.** Every server action is a
   public POST endpoint; `callback_data` in the bot is attacker-controlled. If a bot or a
   hand-made request can reach past a check, the check has to move to the data layer.
9. **A screen that is empty for a reason must say the reason.** An empty queue reads as "no
   patients", a blank admin reads as "broken", and a wrong date reads as missing data.
   Whoever can fix it has to be told which thing is missing, by name.

---

## Brand and language

**The name is `سَنّون`** — fatha on the س, shadda on the first ن. Latin `SNOON`, secondary,
for the domain and nothing else.

This reverses an earlier rule that said no diacritics. `سنون` is a plural of سِنّ; `سَنّون` is
Haider's childhood nickname, and it is his name to choose. Recorded rather than quietly
changed because the old rule was stated as a non-negotiable and someone will otherwise
"correct" it back. Two things follow and are not optional:

- **The diacritics are typed, never drawn.** Six code points — `س` `U+064E` `ن` `U+0651` `و`
  `ن` — and every Arabic face tried renders them correctly. Nothing may hand-draw these
  letterforms as SVG paths: that is how a generated logo ended up spelling a word that does
  not exist.
- **The Latin stays `SNOON`.** Briefly changed to `SOON` and changed straight back. In
  English `SOON` reads as "coming soon", which on a logo says the site is a placeholder.

**Say `منصة سنون`, not `سنون`, where the name names the thing** (`site.platform` carries it).
A bare "سنون" beside a hospital's name reads as a clinic, and the one thing this must never be
mistaken for is the place the treatment happens. `site.name` stays the bare word for running
text where سنون is the subject of a sentence.

**Never write `مريض` in user-facing copy. The word is `مراجع`.** "مريض" labels somebody as
ill, which is not what a person filling in a form is there to be told. Applies to `copy.ts`,
`legal.ts` and every component. **`src/lib/cases/reasons.ts` is deliberately excluded** — those
strings are written into the case event log and are effectively an API, so changing one splits
the audit trail in two.

**The shared pages address neither side directly.** On any surface both audiences see — the
landing page, the fee sentence, the FAQ, the privacy section — write the two roles in the
third person: **"الطالب يتواصل وية المراجع"**, never "يتواصل وياك". The landing page once said
"الطالب راح يتصل بيك", which silently tells every student reading it that the site is not for
them.

This does **not** apply inside the patient-only pages. `/case/new`, the tracking page and link
recovery are read by one person whose role is not in doubt, and the third person there reads
like a policy document.

---

## Arabic and RTL

- `<html dir="rtl" lang="ar">` is the default. LTR is the exception.
- **Tailwind logical properties only** — `ms/me/ps/pe/start/end`. Never
  `ml/mr/pl/pr/left/right`. `tests/rtl.test.ts` fails the build on a physical property.
- Western digits (`1234`), `د.ع` as the currency suffix.
- **All user-facing copy lives in `src/lib/copy.ts`**, not as literals in components. Copy is
  data, not final.
- **Arabic is split per word, never per letter.** Arabic shapes each letter by its neighbours
  inside a word, so wrapping letters individually breaks the joins. Splitting on spaces is
  safe and is the only split this codebase should ever do to Arabic text. (This is also why
  GSAP's SplitText must never be pointed at Arabic.)
- Numerals, dates and phone numbers need explicit direction handling inside RTL paragraphs —
  `ltr-run` or `dir="ltr"` on the run.
- Test with real Arabic content. Latin placeholder text hides RTL layout bugs.

---

## Architecture — the dual-schema pattern

This is the core decision and it maps unusually well onto this product.

**Payload owns configuration** — what an administrator must change without a deployment:
cities, universities (which *are* the dental colleges), academic stages, treatment types,
clinic schedules, per-university stage capabilities, static pages and settings.

**Drizzle owns transactional data** — the things with invariants: cases, students, claims,
appointments, the case event log, reviews.

They live in **separate Postgres schemas** — `payload`, `snoon`, and `auth` for Better Auth.
Application code reads Payload config through the Local API and joins by stable IDs.
**Never write case or claim data through Payload.**

**The join key is each config document's `slug`, not Payload's numeric id.** A case stores
`city_id` and `treatment_type_ids` as plain text in another schema, so the key has to stay
readable in the database and survive the config being edited, re-seeded or restored.

### `src/lib/config/` is split three ways and must stay that way

- `schema.ts` — types and the fixed week. Safe for a Client Component.
- `index.ts` — reads Payload, marked `server-only`. Importing it from a Client Component
  pulls `fs`, `child_process` and the whole CMS into the browser bundle and fails the build.
- `settings.ts` — reads Payload, **not** marked `server-only`, because that guard also makes
  a module unloadable from plain Node — which rules out scheduled jobs and CLI scripts. The
  contact-window expiry is exactly such a job, so a guard there would break the thing it
  governs.

### Custom admin views

Three read across into Drizzle: `/admin/students` (verification), `/admin/cases` (look a case
up by the reference code a patient reads out over the phone) and `/admin/reviews`. They get no
nav entry of their own, so all three are linked from `beforeNavLinks`.

**A custom Payload admin view must authorise itself.** Payload's admin gates the *interface*,
but a custom view is still server-rendered — anything it queries lands in the HTML whoever
asked. `curl /admin/students` returned every student's name and document reference to anyone
until the view started calling `payload.auth()` and returning null for non-admins. **Query
nothing until the caller is known.** The same applies to server actions reached from such a
view: being rendered inside the admin proves nothing about who calls the action.

`/admin/cases` is **read-only**. Case state changes through the lifecycle functions, which
validate the transition and write the audit row — never through a form in the CMS.

### Revalidation

Any page rendering Payload config needs **both** a time-based `revalidate` and an
`afterChange`/`afterDelete` hook calling `revalidatePath`. Without the hook an admin who adds
a city sees nothing change and concludes the admin is broken; without the `revalidate` a
change made outside the admin never lands.

### Uploads and object storage

Uploads go to **Cloudflare R2** through `src/payload/storage.ts`, via Payload's S3 adapter
(`region: 'auto'`, `forcePathStyle: true`).

**R2 rather than Vercel Blob for one reason above the free allowances: a bucket that is
private by default.** `disablePayloadAccessControl` **stays off**, so files are served through
Payload rather than through direct bucket URLs — a direct URL is a URL nobody checks, and it
would make `read: isAdmin` on both upload collections decorative.
`/api/case-photos/[photoId]` still re-answers "who is asking?" on every request and reads the
bytes through `readUpload`, the only thing in the codebase that knows where files live.

**The failure this replaced is not gone, only moved.** `staticDir` writes to a local disk that
Vercel destroys minutes later, so photographs and enrolment documents appeared to save and then
vanished — nothing errored, and the row kept a filename pointing at a file that no longer
existed. **So the thing to verify after any deployment is a photograph that is still there
tomorrow, not a build that went green.**

### Generated files must not depend on the environment

`importMap.js` and the database schema are both generated and committed. Both have already
broken production because they were generated on a machine without R2 — see incidents 1 and 2
in `docs/incidents.md`. `tests/admin-import-map.test.ts` and `tests/upload-schema.test.ts`
hold the property: the declared component set and the upload collections' fields are identical
with and without R2 configured.

**A Payload migration written by hand is not guessed.** `payload migrate:create` needs a TTY,
so run Payload's own `push` against a scratch database at that revision, read the DDL off it,
and diff the hand-written migration's result against the pushed schema until they match.

---

## Domain model

A **patient** submits a **case**: city, one or more treatments, the clinic days they can
attend, contact details, optional intraoral photographs, free-text notes.

Treatment is a **set**, not a single value — a patient often needs several things at once, and
a student matches on any overlap with what their stage may treat. Availability is **days
only**: clinic sessions run in the morning, so there is no time-of-day question, and Friday is
never offered because it is always a holiday.

A **student** belongs to a university and a stage and has a verification status. A verified
student sees cases matching their university's city and their stage's treatment capability,
and may **claim** one. A **claim** binds one student to one case; on successful claim — and
only then — the contact details become visible.

**Cases are presented as clinical cases, never as a list of people.** Use language like
`حالة علاجية متاحة`. No "browse patients", no photos of faces in listings, no ranking of
people.

### A university is its dental college

سنون had `universities` *and* `colleges`, and a student picked both. **Every Iraqi university
has exactly one dental college**, so the college carried no information the university did
not — and the "clinics" inside it (operative, surgery, prosthetics) are departments every
student rotates through, not somewhere anybody belongs.

The `colleges` collection is gone and the queue's city comes from the university in one hop.

**The exception mechanism survives, re-keyed to the university, and is deliberately empty.**
A few universities — mostly the north and Kurdistan — are said to differ, putting students
onto real patients earlier and possibly allowing molar endodontics. Haider is not certain of
either, **so nothing is seeded**. What exists is the shape: a `stage-capabilities` row naming
a university and a stage overrides that stage's defaults there, with no deployment. Keep the
door open; walk through it only if students from one university turn up and ask.

An *earlier stage* works through the same door: add the stage with an **empty** default list,
then grant it in `stage-capabilities` for the one university that allows it.

**Capability falls back to the stage's default.** An absent `stage-capabilities` row means
"whatever this stage can do anywhere", never "nothing" — otherwise adding a university would
hide every case from its students until someone filled in the whole matrix, and the symptom
would be an empty queue.

### Cases that need two stages

The two years do not treat the same things. Seeded as each stage's default in `seed.ts`:

| | treatments |
|---|---|
| both years | فحص · حشوة · قلع · تنظيف |
| fourth year only | طقم جزئي |
| fifth year only | علاج عصب · طقم كامل · تقويم أسنان · أسنان الأطفال · فلورايد |

So a patient wanting a partial denture **and** a root canal needs a fourth year *and* a fifth
year, and neither can finish the case alone. Three consequences, all built:

1. **Visibility is overlap, not containment.** A case wanting a filling and a root canal is a
   fourth year's case for the filling. Hiding it would leave the patient waiting for a student
   who can do everything, and there is no such student. What their stage may not perform is
   **marked** in the queue rather than removed.
2. **The remainder is handed on, not duplicated.** `returnRemainderToQueue` puts the case back
   to `REQUESTED` carrying only what is outstanding and closes the first claim as COMPLETED.
   One row keeps the tracking link working, the number in one place, the photographs attached
   and the whole story in one event log.
3. **What counts as "my part" is read from the server**, never from the form.

**The one exception to overlap: `paediatric`.** A case carrying it is visible **only** to a
stage that can perform it — containment for that one slug. A child needing a filling would
otherwise overlap on `filling` and appear to every fourth year in the city, who must not treat
children at all. The overlap rule exists so a patient is not left waiting for a student who
can do everything; that reasoning does not hold for a child, whose whole case belongs to one
department.

**Seeding a stage's defaults is additive** — it adds what is missing and removes nothing. See
incident 7.

---

## Case lifecycle

```
REQUESTED ──claim──> MATCHED ──patient confirms contact──> CONTACTED
    ▲                   │                                      │
    │                   │ contact window expires               │ appointment set
    │                   ▼                                      ▼
    └──── RETURNED_TO_QUEUE ◀── NO_CONTACT          APPOINTMENT_CONFIRMED
                                                               │
                                              ┌────────────────┼────────────┐
                                              ▼                ▼            ▼
                                         COMPLETED         NO_SHOW      CANCELLED
```

Also `EXPIRED` for cases that sit in `REQUESTED` past their useful life. Two edges the diagram
does not show:

- `MATCHED | CONTACTED → CANCELLED` when the claimant reports that whoever answered never
  asked for treatment.
- `APPOINTMENT_CONFIRMED → REQUESTED` when one student finished their stage's part and the
  case still needs another stage.

Rules:

- Every transition is written to the case event log with actor, timestamp and reason.
- Transitions are validated server-side against an explicit allowed-transitions map. **Never
  let a client send an arbitrary target state.**
- `RETURNED_TO_QUEUE` restores the case to `REQUESTED` and records the failed claim, so the
  same student is not offered it again immediately.
- **The patient must have a way to confirm whether contact actually happened.** The student's
  word alone does not advance `MATCHED → CONTACTED`.

Reasons written to the event log live in `src/lib/cases/reasons.ts`, not as literals at each
writer. They are stored in the database and are effectively an API.

### After contact

Driven by the student on the case they hold, in `src/lib/cases/lifecycle.ts`.

- **Appointment times are Baghdad time, always.** `<input type="datetime-local">` submits a
  wall clock with no zone, so the server decides what it means — trusting the browser's zone
  would let a student whose phone is set elsewhere book a patient hours from the time they
  typed. Iraq has no daylight saving, so a fixed `+03:00` is correct.
- **And so is every other date**, which it once was not — see incident 3. `BAGHDAD_ZONE` is
  the only place the zone is named and every formatter takes it.
- **Rescheduling supersedes rather than overwrites**, and a partial unique index allows only
  one live appointment per case.
- **An outcome closes the claim** in the same transaction.
- **Contact details go away when the claim closes.** The grant was for the active claim.
- `expireStaleRequestedCases` only ever touches `REQUESTED`.

### Claiming must be atomic

```sql
UPDATE cases SET status = 'MATCHED'
 WHERE id = $1 AND status = 'REQUESTED'
```

If `rowCount === 0`, someone else got there first — return a clean "no longer available".
Insert the claim row in the same transaction. Second line of defence:

```sql
CREATE UNIQUE INDEX one_active_claim_per_case ON claims (case_id) WHERE status = 'active';
```

**Do not implement this check by reading, then deciding, then writing.**

### Claiming must also be authorised, which is a different thing

`claimCase` is the atomic part and takes a case id on trust. That was a real hole: the web
claim is a server action, every export from a `'use server'` file is a public POST endpoint,
and the case id comes off the form — so a verified student in Basra could post a case id from
Mosul and be handed that patient's number. The queue never showed it to them, which is not the
same as it being refused.

**`claimCaseForStudent` in `src/lib/cases/claim.ts` is the only way in**, from the site and
the bot alike. Four things about it:

- **The check is the queue itself.** Rather than restate the visibility rules, it asks
  `listOpenCasesForStudent` for that one id (`onlyCaseIds`) and requires it to come back. One
  implementation of visibility, used both to draw the list and to authorise acting on it — so
  a future change to what a student may see changes what they may claim in the same edit.
- **Day overlap is enforced here and only here.**
- **The cap on concurrent claims is enforced here too**, and checked **last**. The other
  refusals say "this case is not yours"; this one says "your hands are full", which would
  confirm to an out-of-scope probe that the case exists and is claimable.
- **It fails closed on a missing mapping.** A university with no city means "claims nothing".

The cap is a Payload setting (`maxActiveClaimsPerStudent`, default 1) and is **not** in a
transaction with the claim: the worst a race costs is one student one case over the cap, which
self-corrects. That is a different order of thing from "a case can never be claimed twice".

**The queue is always drawn in full.** At the cap the claim button is disabled with a sentence
naming what clears it, and the held cases are listed above it. See incident 5 for why.

### Days, and asking about a day the patient did not pick

A student is in clinic on the days their timetable says; a patient names the days they can
come. سنون collected both and matched on neither.

- **Overlap → claim as usual.**
- **No overlap → the case is still shown, but cannot be claimed.** The student may *ask*
  instead, and asking grants nothing: no case, no phone number, no hold on the queue.
- **Only the patient's yes turns a request into a claim**, through the same conditional update
  an ordinary claim uses.

`day_requests` holds **one row per day, not per student**. That is the question the patient is
actually answering — "can you come on Saturday?", not "do you want student X" — and it settles
two students wanting the same day without the patient ever choosing between people: they are
asked once and the earliest asker wins.

Asked in both channels, because Telegram is optional. The callback payload carries the **day,
never the case** — callback data is attacker-controlled, and the case comes from the chat's
own binding.

**The patient is told about this on the form**, next to the day picker. Without saying so, a
later "could you come on Saturday?" reads as the site ignoring what they filled in.

`students.clinic_days` is empty for every student recorded before this existed, and **empty
means "any day"** — adding the field must not silently empty anyone's queue.

### Filtering the queue — two lists that must not be confused

Days and treatments, several from each, newest first. **A plain GET form inside a `<details>`,
with no JavaScript**: the browser builds the query string and navigates, so it works before
hydration and on a phone that never finishes running the bundle.

The part that is not a convenience:

- `treatmentTypeIds` is the **scope** — what this student's university and stage allow,
  decided server-side. It is an access-control boundary.
- `onlyTreatmentTypeIds` and `onlyDays` are the **filter** — values off a query string a
  student types.

Putting the query string into the scope field would turn `?t=root-canal` into a fourth year
asking for a fifth year's queue and being handed it. **The filter is an additional condition
that can only ever remove rows**, and its values are validated against the student's own scope
first. `tests/queue-filter.db.test.ts` asserts the escape attempt returns nothing.

- **An empty filter is not "match nothing".** The page passes `[]` when no box is ticked.
- **A filtered-empty list gets its own sentence**, and the filter stays on screen to be
  cleared.
- **Newest first**, on Haider's instruction, reversing oldest-first. The cost: an unclaimed
  case sinks and only `expireStaleRequestedCases` catches it. **If old cases start expiring
  unclaimed, this is why**, and the answer is a sort the student chooses.

### The contact window

After claiming, the student has a limited window. **48 hours, not 24** — students are in
clinic during the day and patients may not answer first try. A Payload setting, not a
constant.

**Both timed jobs run from one endpoint:** `GET|POST /api/cron` releases claims whose window
ran out and expires cases nobody claimed. A plain HTTP route on purpose — a Vercel cron, a
Dokploy cron running curl or a systemd timer all drive the same code.

**Once a day, not hourly, and that is a Vercel Hobby limit.** A Hobby account refuses any cron
that would fire more than once a day, so an hourly schedule is not a thing that runs less
often — it is a deployment that does not happen. The cost is latency, not correctness: both
jobs are conditional updates guarded by the status they may come from, so running them once a
day is exactly as safe. If the latency matters more than the money, the answer is not Pro — it
is any external scheduler hitting the same URL with `CRON_SECRET`.

**Functions run in Frankfurt because the database does.** `vercel.json` sets
`regions: ["fra1"]`. What costs time is not Baghdad-to-server but server-to-Postgres, because
one page does several queries and each pays the round trip. **So the two must be changed
together or not at all** — moving the database without this line, or this line without the
database, makes سنون slower than leaving both alone.

`CRON_SECRET` must match, compared in constant time, as `Authorization: Bearer` or
`x-cron-secret`. It **fails closed**: an unset or implausibly short secret refuses everything.
`src/lib/cron-auth.ts` holds that logic so it is testable rather than buried in a route.

**When the patient never answers at all** — ordinary on a cheap phone, not a failure.
Reporting contact *extends* the window by a configurable grace (default 48h). When even that
runs out, **the expiry job leaves the claim alone**: it only ever releases claims where
`contact_asserted_at IS NULL`, the case it was written for. The claim then surfaces to an
admin at `/admin/cases` (`listClaimsAwaitingPatient`), who rings the patient and either
confirms contact or returns the case to the queue.

Neither is automatic, deliberately: advancing on the student's word is what the confirmation
rule exists to prevent, and releasing punishes the one person who did what was asked. **An
admin who has rung the patient is a check; a timer is not.** This does not scale to thousands
of cases and does not need to — at one or two cities it is a handful a week, and a wrong
automatic answer costs someone their treatment or their case.

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

`listCasesForStudent()` returns a narrow projection type that **structurally cannot contain
contact fields**; `getCaseForClaimant()` is the only function that returns them and it takes
the claim as an argument. Let TypeScript enforce it.

**The rule binds inside the admin too.** `listRecentCasesForAdmin` has no contact columns in
its projection at all, so the overview cannot leak a number however it is rendered.
`findCaseForAdmin` is the only admin function returning them, and only for a single case an
admin typed the code for.

### Rate limiting

`src/lib/rate-limit.ts`, keyed by the proxy's `x-forwarded-for`, covering the case form,
sign-up, login, Telegram invites, the patient's contact answer and reviews. **In memory on
purpose**: a shared store is worth adding the day سنون runs on more than one instance, but a
limiter that costs nothing and holds for a single server beats a correct one that is not
built. **Successful attempts count too** — limiting only failures leaves the case that
actually fills a disk unlimited. Login is keyed by address rather than by email, or anyone
could lock a student out of their own account.

### Security review findings, already applied

- `serverActions.bodySizeLimit` fits the documented photo limits, and the browser applies the
  same limits before uploading — see incident 9.
- **Nothing that merely answers a question is exported from a `'use server'` file.**
  `isPatientLinked` and `isStudentLinked` took an id and answered a question about it; they
  are plain queries now.
- `next.config.ts` sets security headers: nosniff, an explicit `Referrer-Policy` (a tracking
  token is in the URL and that page links out to Telegram), `frame-ancestors 'none'`, and
  `private, no-store` plus `noindex` on every page carrying contact details. **There is still
  no `script-src`** — Next and the Payload admin both inline scripts, so a real CSP needs
  nonces through both and is its own piece of work.
- Both shared secrets go through `src/lib/secure-compare.ts`.
- Payload access rules name `admins` rather than saying "is anyone logged in".

Verified sound: Payload's REST and GraphQL both refuse `student-documents`, `case-photos` and
`admins` to an unauthenticated caller; upload file routes return 403; every server action
resolves the acting student from the session and never from the form; nothing logs a phone
number, a document or a photograph.

---

## Privacy

### Photographs

- **EXIF is stripped** by `processCasePhoto`: `rotate()` bakes the orientation tag in, then the
  WebP re-encode drops all metadata. This is the part that matters most — a phone photograph
  carries GPS, and publishing a patient's home coordinates alongside a picture of their mouth
  is a serious harm that is invisible unless something checks.
  `tests/image-processing.test.ts` builds an image that really carries GPS tags and asserts
  they are gone, in the parsed metadata and in the raw bytes.
- Re-encoded to WebP, long edge capped at 1600px, never upscaled, 12MB in, at most four per
  case. Whatever arrived is decoded and rewritten, so a file that merely claims to be an image
  does not survive.
- Stored outside `/public`, served only by `/api/case-photos/[photoId]`, which **re-answers
  "who is asking?" every request** — a session valid a minute ago proves nothing, and a
  student suspended since then stops seeing them at once. Three viewers: an admin, a
  **verified** student (before claiming too, since photographs are how they judge whether they
  can treat the case), and the patient carrying their own tracking token. Everyone else gets
  **404, not 403**: whether a photo id exists is itself something only an allowed viewer
  should learn.
- A 480px `thumb` is generated on upload and served by `?size=thumb`, falling back to the
  original for photographs that predate the size. **A new image size needs a Payload
  migration** — the sizes are columns, and without one the size is silently not generated.
- The upload warns in Arabic not to photograph the face, on the field itself.
- Deleted `photoRetentionDays` after a terminal state. The row is **kept and marked** rather
  than removed, so a case that had photographs stays distinguishable from one that never did.

**The patient sees the photograph before it is sent** — `src/components/photo-picker.tsx` and
`src/lib/images/edit.ts`. Remove, rotate a quarter turn, crop. **Cropping is a privacy control,
not a convenience** — it is how a lip or a chin that crept into the frame comes out, decided
by the one person who can see the picture. Five rules, and the first two are the ones a later
change would break:

- **It is an enhancement over a control that already worked.** The real
  `<input type="file" name="photos">` is still what the form posts; edited files are written
  back with `DataTransfer`. With JavaScript off the originals go up exactly as before.
  `canEditPhotos()` is read through `useSyncExternalStore` with a server snapshot of `false`.
- **It never replaces the server's processing and must not be made to.** Everything here runs
  on a machine we do not control and a hand-built request skips it entirely. The browser's
  work is a saving and a choice, never a check. Every failure falls back to the original file
  — an editor is the last thing that may stop somebody submitting a case.
- It makes the upload dramatically cheaper: at 400kbps a 12MB photograph is roughly four
  minutes and the WebP that leaves instead is a few hundred kilobytes. The cap (`MAX_PHOTO_DIMENSION`) therefore
  lives in `limits.ts` rather than beside sharp; two different caps would mean the patient pays to
  upload pixels the server throws away.
- **Edits always apply to the original**, never to the last result.
- **The crop frame is the one place in سنون that sets `dir="ltr"`**, and it is right: a
  photograph has no reading direction, and the crop's x is measured from the picture's own left
  edge, which is where the canvas reads it and where `clientX` grows from.

### Contact data

Phone numbers are the most sensitive field in the system. They exist to be shown to exactly
one student. **Do not log them, do not put them in error messages, do not include them in any
list endpoint.**

**Three legal shapes, and Arabic digits are one of them.** 11 digits starting `07`, or 10
starting `7`, or the international form — `+964`/`00964` then the 10 digits without the
leading zero. `normalisePhone` accepts all three plus spaces, dashes, and both Arabic-Indic
(`٠١٢٣`) and Extended Arabic-Indic (`۰۱۲۳`) numerals. **Never put a `pattern` on the phone
input** — see incident 11.

### Nobody proves they own the phone number

A patient needs no account, which is the point. It also means a case can name a number its
owner never gave. **There is no free way to prove ownership** — an SMS code is exactly what
this project excludes. So the number is not verified, and the design says so plainly: cap the
damage before the call, stop it in one tap after.

- **Before.** A number may hold a few open cases at once — a household shares a phone, and a
  mother submitting for herself and her child is ordinary — but not dozens, and not many in a
  day. Both caps are Payload settings.
- **During.** The claimant's screen opens with what to say: identify yourself and سنون, and
  check the person actually submitted the request before discussing their case. That sentence
  is the real mitigation for the human moment.
- **After.** `reportWrongNumber` closes the case for good, releases the claim so it counts as
  neither finished nor failed, revokes the tracking token, and puts the number on a cooldown (`snoon.phone_blocks`).

The cooldown falls on the person who did nothing wrong. Uncomfortable and still right: it is
the only handle that stops the same submission an hour later, it lifts by itself, and an admin
can lift it from `/admin/cases`. **The refusal message is written for the real owner** rather
than for whoever misused the number.

Deliberately **not** recorded: the submitter's IP on the case. It would be the only handle on
the person responsible, and logging every patient's address for a rare event is not a trade
data minimisation allows.

### Retention

All three are Payload settings. Photographs go **60 days** after a terminal state; contact
details — name, phone **and the patient's own notes** — go at **90 days**; the case row is kept
indefinitely.

`scrubExpiredContactDetails` **erases rather than deletes** and marks `contact_scrubbed_at`,
for two reasons: an admin has to be able to answer "what happened to SN-4KP7QW" when someone
rings months later, and for a case that went wrong the event log is the only record there is.
A case that had a patient must also stay distinguishable from one whose details were never
filled in.

**Scrubbing takes the keys with it** — the tracking token is revoked, any Telegram binding for
the case goes (both are live credentials), **and the optional patient-account link**, which
would otherwise keep the case attached to a named, addressable person long after the details
on it were erased.

---

## Authentication

### Students

Better Auth with email and password, email verification by link — then a **manual verification
step**, because university email is not reliably available in Iraq. The student provides proof
of enrolment and an admin reviews it at `/admin/students`. The document is a Payload upload
collection with `read` restricted to admins, stored outside the public directory.

**The document may arrive two ways**: uploaded on the site, or photographed and sent to the
Telegram bot — far less work on a cheap phone, and this is the step students drop off at. Both
routes end in `attachVerificationDocument`, so the rules live in one place:

- Accepted only while `PENDING` or `REJECTED`. A `VERIFIED` student must not undo their own
  approval by sending another photograph, and a `SUSPENDED` one must not re-enter the queue.
- A rejected student sending a clearer document returns to `PENDING` and the previous reviewer
  is cleared, since that decision no longer describes what an admin is looking at.
- Size is checked against Telegram's declared size *before* downloading and against the real
  bytes after — the declared size is a claim from the same message the file came in.

**Telegram never decides anything.** It carries the photograph; the admin still approves.
Manual review is correct at this scale — **do not build automated document checking.**

Sign-up does not reveal whether an address is already registered, and creates no session while
verification is required. Both shape the flow: sign-up redirects to a "check your email" page
that also tells a student who already has an account to log in instead.

**Email is Resend**, sent with plain `fetch` — one POST is the whole API surface used.
`isEmailConfigured()` means `RESEND_API_KEY` **and** `EMAIL_FROM` are both set. Any flow that
depends on a message arriving must check it **before writing anything** — see incident 6.

**Resend delivers to arbitrary addresses only once a sending domain is verified.** Until then
it accepts mail only to the account owner's own address. **So a domain is on the critical path
for the student side.** The patient side is unaffected.

### "Continue with Google"

Until a sending domain exists, the only way into سنون that works in production — Google has
already verified the address, so there is no message to send. It also fits the median user: a
low-end Android phone is already signed into Google. `src/lib/oauth.ts`.

- **Students only.** Patients never get an account through it.
- **It does not grant verification, and must never be made to.** Google answers "who owns this
  address?". Whether somebody may see a patient's phone number is
  `students.verification_status`, which an admin sets after reading a document.
  `tests/google-signin.test.ts` asserts the profile mapper returns exactly `name`, `email` and
  `emailVerified`.
- **The profile picture is dropped at the boundary.** Google returns a link to it and Better
  Auth would store it by default; `mapGoogleProfile` does not keep it. سنون shows no faces
  anywhere — a field needs a reason, not an opportunity.
- **`emailVerified` comes from Google's claim**, not from the fact of signing in.
- **Account linking is left at Better Auth's defaults.** `requireLocalEmailVerified` stops an
  attacker who pre-registered an unverified account at someone's address from having that
  person's Google identity linked into the attacker's row. **Do not relax it.**
- **Driven from a server action**, not Better Auth's browser client, which would put the whole
  client in the bundle for one redirect.
- The Google mark in `google-button.tsx` is **the one component allowed literal colours** —
  Google's terms require their four colours, and those belong to Google rather than to
  `tokens.css`.

**The redirect URI is built from `BETTER_AUTH_URL`**, not the host the request arrived on. So
`<BETTER_AUTH_URL>/api/auth/callback/google` is what must be registered in Google Cloud,
exactly, port included. A mismatch is refused at Google's own screen with
`redirect_uri_mismatch` before anything reaches سنون — nothing in our logs explains it.

Sign-up has **three** states because two independent things can each be missing: both
configured shows both paths; Google alone shows the button and says password sign-up is not
open yet; neither shows the closed notice. **The middle one is where سنون is.**

### Patients — no account is ever required

A submitted case returns a **reference code** plus a signed tracking link the patient can
bookmark. Tracking tokens are long, random, single-case scoped, and revocable. The database
holds an **HMAC of the token, never the token**.

**Link recovery — `/case/find`.** Reference code plus the phone number on the case. Neither
alone is enough; the code is not a secret and the phone is what سنون is protecting, so the
pair stands in for a password.

- **One answer for every failure.** A wrong code, a wrong number, a case that never existed
  and a revoked link all return the same sentence. Any difference makes this an oracle. An
  unparseable phone is simply a number that matches nothing.
- **It reissues rather than resends** — the original is unrecoverable by design, and the old
  link dying is the right outcome anyway.
- **A revoked link stays revoked**, or `reportWrongNumber` stops working.
- **A scrubbed case cannot be recovered** — an empty submitted value must never match the
  empty phone column.
- **The rate limit is the security control**, not the comparison. Ten an hour per address.
- The phone is **not** handed back to the form on failure, against the general rule that a
  rejected form keeps what was typed: two fields is not a case form, and echoing a number into
  the HTML of a page that just refused is how it ends up in a shared phone's cache.

**The optional patient account — `/case/mine`.** Google only, because the entire justification
is that it costs seconds. `cases.patient_auth_user_id`, null on most rows, and that is normal.

- **Nothing may require it, and no student-facing or admin query may branch on it.**
- **Attached two ways**: at submission from the session, and afterwards from the tracking
  page, where **the tracking token is the proof of ownership**. The second matters more — the
  realistic order is submit, get a link, and only later decide not to depend on it.
- **Holding the link does not take a case off an account that already has it.**
- **The retention scrub nulls the link**, or the scrub would be cosmetic.
- `listCasesForPatient` has **no contact columns in its projection**.
- **No sign-in button on `/case/new`.** A sign-in prompt on a medical form reads as a demand
  however it is worded, and the case form must never acquire a step.

Recorded because the reasoning applies if this is revisited: a patient account is a poorer fit
than it looks — a household shares a phone, plenty of Android phones here were signed in once
by a relative, and an account is an email address kept indefinitely for someone whose case
details are deliberately erased at ninety days. Haider weighed those and chose to offer it
anyway, **optional**. Optional is what makes it safe, so it is the part to defend.

---

## The guided questions — `/case/guide`

A patient who knows they want a filling ticks the box; a patient whose tooth simply hurts does
not. The tree asks a few plain questions instead, each narrowing to the next, and ends either
in a set of treatments to tick or in "this is not something a student clinic should handle".

**Three layers, and the order is the point:**

1. **The emergency screen, for everybody, before anything else.** Six yes/no items on one
   page; any tick ends in a hospital referral.
2. **Age.** Under fifteen is a paediatric case.
3. **What they need** — the tree.

Layer 1 moved to the front to fix a real bug: red flags used to be *answers inside branches*,
so a person with a spreading facial infection who tapped "عندي سن مفقود" never saw the
question at all. Asking up front catches everyone and costs one screen.

**Five rules, none cosmetic:**

1. **It never diagnoses, and the copy must never read as one.** Every leaf says what the
   description *resembles* and that the student will decide — `يشبه`, `الطالب راح يشخّص` —
   never `عندك`. A test greps for the diagnosing form, because this is the rule that would
   erode one well-meaning copy edit at a time.
2. **A result is a set of treatment slugs and nothing else** — the same slugs the form's
   checkboxes carry. No new field, no text landing on the case.
3. **The path is never stored and never goes in the URL.** Which answers somebody picked is
   health information about them. Only the current node id is in the query string; a full path
   would follow them into their history, into the `Referer` header, and into any screenshot
   they send. "رجوع" is computed from the tree. **The emergency checkboxes all carry the same
   name and the same value and the server only counts them** — `screenOutcome` reads whether
   there were any, never which — because a distinct value per box would put a list of a
   stranger's symptoms into their history and into the `Referer` header on the way out.
4. **A student may not root-fill a molar.** Molars carry several roots and several canals and
   a university clinic does not let a fourth or fifth year attempt them. So "pain that sounds
   like a root canal" asks *which tooth* first — anterior and premolar go through, a back
   molar is sent to a dentist, "not sure" becomes an examination. A referral carries `now`,
   `soon` or **`scope`**, and `scope` is styled plain grey rather than in the danger colour:
   "students may not do this one" is information, and dressing it like a spreading infection
   tells somebody with an aching molar they are in danger when they are not.
5. **Some answers must not end in a treatment at all.** A triage tree with no exits is worse
   than no tree, because it routes everything into the one place it knows. **The referral
   screens offer no route to the case form** — a "قدّم حالتك" button under "go to a hospital
   now" would read as permission to wait. There *is* a quiet link below a divider, worded as a
   claim the person makes about themselves ("شفت طبيب أصلاً، أو أشّرت غلط؟"), for somebody who
   has already been or mis-tapped.

**Every answer is a real `<a href>`, and that is the whole design.** The obvious way to hold
tree state is a Client Component — which leaves a patient on a slow connection staring at a
dead question, on the one page that exists for people who are already unsure. The current node
lives in the query string, so every answer is an ordinary link. Verified with
`javaScriptEnabled: false`: the whole tree walks, the handoff pre-ticks the form, and a junk
node id lands on the first question rather than a blank page.

**Children.** Under fifteen is not a dead end: it asks milk / permanent / unknown, then what
the child needs, including fluoride. **Under fifteen is a flat line, deliberately** — Haider
raised the nuance himself (a thirteen-year-old could be seen in operative) and ruled on it:
*"this is a bit tricky and misleading, keep it as fifteen"*. A patient in front of a form
cannot be asked to judge which department suits their child's tooth.

**A result is not the end — "تشكي من شي ثاني؟"** A broken filling *and* a tooth that needs
taking out is one visit and two complaints. The second round **skips the emergency screen and
the age question** (`triageResume`) — those are about the person, not the complaint, and were
answered a minute ago; asking again reads as the site not having listened. Which branch to resume into is **inferred from the collected slugs, not remembered**,
because remembering would mean carrying the route. The card shows everything collected, not
just this round's.

**"دلّني على أقرب مستشفى"** is a maps *search*, not a pin: `/maps/search/?api=1&query=مستشفى
طوارئ` runs against the device's own location, so it lists emergency departments actually near
whoever tapped it — and سنون never learns where they are.

**The handoff only ever pre-ticks.** `/case/new?t=root-canal` arrives with that box checked
and everything else exactly as editable. A rejected submission's own values always win over
the guide's suggestion. Unknown slugs are filtered against the real treatment list.

`tests/triage.test.ts` holds the structure, and the assertion that matters most is that every
result names a treatment **read out of `seed.ts` itself** rather than a copied list — a copied
list passes forever after somebody renames a slug, and the symptom is a patient landing on a
form with nothing ticked.

> **The clinical content is a DRAFT and must not launch unreviewed.** See open decision 5c.

---

## Notifications — the Telegram bot

Telegram is free to send on, which is the whole point: a push channel without the per-message
cost that rules out SMS. `src/lib/notifications/` is the interface — a status change calls
`sendNotification()` and knows nothing about channels. Telegram registers itself only when a
bot is configured, so an unconfigured deployment reports `NO_CHANNEL` rather than failing.

- **Sending is never a precondition.** A claim that succeeded is not undone because a message
  failed, and notification happens after the state change, never inside its transaction.
- **Invite tokens are stored hashed**, keyed with a distinct label so one can never be replayed
  as a tracking token. The link is a credential.
- **Single use.** An invite already bound to one chat is refused for another, so a forwarded
  link cannot move a patient's notifications to a stranger.
- **The webhook is a public URL.** The only thing separating a real update from a forged one is
  `X-Telegram-Bot-Api-Secret-Token`.
- **A patient's invite is minted from their tracking token**, never from a case id in a form.
- **Nothing in the product may require Telegram.** A patient without it must still be reachable
  by phone and must still be able to use the tracking link.

**The bot is a place students work, not only where messages arrive.** `/cases` walks the queue
one case at a time (Telegram stacks buttons under one message, so a list of five means five
buttons with nothing to tell them apart). The cursor is a **case id rather than an index**,
because the queue changes under the reader; a cursor that no longer exists restarts the walk
rather than dead-ending. A claim button goes through `claimCaseForStudent`. `/status` for a
patient, `/help` decided by what the chat is bound to.

**The new-case alert is the one thing the site structurally cannot do.** A queue only helps
somebody who thought to open it, and a student with nothing waiting has no reason to look.

Rules across all of it:

- **Nothing the bot sends carries a phone number or a patient's name** — not even to the
  student who has just claimed the case and is entitled to it. Telegram keeps history on its
  own servers, where سنون cannot scrub a number when retention runs out. The claim reply is a
  link to the case page, and that is one tap. `tests/telegram-commands.db.test.ts` asserts it
  of every canned message.
- **The bot never decides what a student may see.** Both the queue and the alert ask
  `listOpenCasesForStudent` — the alert per candidate with `onlyCaseIds`, so "would this have
  appeared in their queue?" is answered by the code that draws the queue.
- **The alert is a query per linked student, deliberately.** Tens of cheap indexed queries per
  case. Collapsing it into one join means reimplementing the visibility filter. At hundreds of
  students it becomes one query grouped by (university, stage); not before.
- **Who is asking always comes from the chat binding, never from the message.**

**Locally there is no public URL**, so `pnpm telegram:poll` long-polls `getUpdates` and feeds
them through the same `handleTelegramUpdate`. Never run it while a webhook is registered.

### Notification settings — silence is not invisibility

`/student/notifications`: do you want alerts for new cases, and if yes a list of every
treatment with **everything ticked**, unticking what you do not want.

**The rule the whole feature rests on: this silences a message, it never hides a case.** A
muted treatment still appears in the queue and is still claimable, and the page says so. If
the two ever merge, a checkbox ticked a month ago quietly shrinks somebody's queue.

- **The stored value is the muted set, not the wanted set.** An inclusion list is a snapshot of
  the treatments that existed the day it was saved, so adding one later would send its alerts
  to **nobody** — the `ensureStageDefaults` failure again.
- **A case is silenced only when *every* treatment on it is muted**, or a cleaning bundled with
  a root canal is lost to a student who muted cleanings.
- **Turning alerts off does not clear the per-treatment choices.**

Settings live on the **student**, not the chat binding, so they survive relinking. The
student's Telegram binding is per account; the **patient's is per case**, and has to be.

**Visible to an admin at `/admin/students`**, with clinic days, link status and the student's
full case record — two batched queries (`summariseClaimsByStudent`, `listLinkedSubjectIds`)
rather than one per row, and **no contact columns**.

---

## Reviews of سنون — the service, never the people

Haider's scope, and the scope is what makes it safe: **"التقييمات للان فقط للادمن، و يكون
بشكل عام عن الخدمة و سنون"**.

This is not what the MVP list excludes. `ratings or reviews of students` is a reputation
system: it scores a person, and the moment a score can affect who gets a case it becomes a
reason for students to compete over patients — which is precisely what makes عالجني a
different product. **Nothing here scores anybody.** A student's standing remains
`verification_status` and nothing else.

`src/db/queries/reviews.ts`. What holds the line:

- **The negative invariant is the design**: no student-facing or patient-facing query may ever
  read the table. Nothing sorts a queue by it, nothing shows an average beside a case, nothing
  tells a student what anybody said. `tests/reviews-are-admin-only.test.ts` asserts it against
  the source tree. **This is a rule that would erode rather than break**, which is why it is a
  test and not a paragraph.
- **The copy carries it too**: "رأيك عن سنون كخدمة، مو عن الشخص اللي تواصلت وياه" sits above
  the field. Take that sentence out and the same form is a rating of people.
- **One per side per case**, enforced by a unique index rather than read-then-write.
- **Only once the case is over** (`COMPLETED`, `NO_SHOW`, `CANCELLED`, `EXPIRED`).
- **A patient's review records no identifier at all** — they have no account, and the case it
  hangs off is scrubbed at ninety days. The student's id *is* stored and never shown outside
  the admin.
- **The admin sees the distribution, not only the mean.** Two fives and two ones average the
  same as four threes and mean something completely different.
- **A patient is identified by their tracking token**, a student by their session *and* a claim
  on the case, both checked in the action rather than assumed from the page.

**Publishing a comment on the landing page is a stated maybe and is not built.** It needs the
author's explicit permission and a decision about the "no testimonials" rule.

---

## UI conventions

Full reasoning, measurements and the competitor analysis are in **`docs/design.md`**. The
rules:

- shadcn/ui on **Base UI, never Radix**. Check an existing component before adding a
  dependency.
- **Mobile-first.** Design the narrow viewport, then widen.
- **Server Components by default**; Client Components only where interaction requires it.
- **A rejected form must never empty itself.** React 19 resets a form after an action runs,
  back to each input's *default*, so an action that fails validation has to hand the submitted
  values back and render them as `defaultValue` / `defaultChecked`. A `<select>` additionally
  needs a `key` tied to the value. Losing a filled-in case form over one mistyped digit is
  where a patient on a slow phone gives up.
- **The student dashboard is a tool, not an experience.** Speed and density; visual novelty is
  a cost.
- **Every colour, font and radius lives in `src/styles/tokens.css`.** Components reference
  `var(--…)` and never a literal, so the product re-themes by editing one file. If a colour is
  wrong, it is wrong there.
- **`--color-accent-fill` is what a filled button is made of; `--color-accent` is what text is
  made of.** They are the same on the teal and different on the students' orange, because light
  orange cannot do both jobs — an orange dark enough to carry white is brown.
- **Colour is never the only signal.** A ribbon carries a colour *and* its Arabic label.
- **Each audience has its own colour**, scoped to surfaces one audience owns: `/student/*` is
  orange throughout via one `.student-area` wrapper that re-points the accent tokens. The
  landing page stays green — it is the door both audiences come through.
- **Prettier is not the house style.** There is no config, its defaults disagree with the
  codebase, and running it rewrites every line of a file. Match the surrounding code by hand.

### The shared vocabulary — build from it, do not restyle locally

- `components/ui/button.tsx` — `buttonClass(variant, extra)` and `ButtonLink`. Returned as a
  class string so it works on a `<button>`, a `<Link>` and a bare `<a>`. Four variants; **at
  most one `primary` per screen.**
- `components/ui/card.tsx` — `Card`, `CardBody`, `CardRibbon`, `Chip`, `MetaRow`, `statusTone`.
- `components/ui/icon.tsx` — the icon set, drawn inline, all `aria-hidden`.
- `components/ui/field.tsx` — `FormSection`, `labelClass`, `controlClass`, `optionClass`.
  **Every input in سنون comes from here.**
- `components/site-chrome.tsx` — `SiteHeader`, `SiteFooter`, `PageShell`.
- `components/ui/section.tsx` — `Section`, `Eyebrow`, `PageHeader`.

### Motion

`src/styles/motion.css`. No JavaScript, no library, no second request — except GSAP `Flip`
for one shared-element transition, behind a tier gate so the two cheap tiers download nothing.

`[data-motion]` on `<html>` selects `none` / `standard` / `full`, decided by an inline script
in `<head>` before first paint. **`standard` is the server-rendered default and every
fallback.** Rules new motion must follow:

- **Transform and opacity only.** Both composite on the GPU.
- **Never hide content that motion might not reveal.** `opacity: 0` starting states live
  *inside* the `@supports (animation-timeline: view())` gate, so an unsupported browser shows
  the text plainly. A missing animation must degrade to visible, never to blank.
- **A scroll-driven animation does not finish — it freezes where the reader stopped.** Every
  reveal range ends inside `entry`, and only properties readable half-applied may be animated.
  See incident 10.
- **`prefers-reduced-motion` wins**, delays as well as durations.
- **The register is calm.** Nothing bounces, spins, slides in from off-screen, or loops in the
  reader's peripheral vision. The page should look like it is settling, not performing.
- Hover effects are behind `@media (hover: hover)`.

### Error pages

Three files, not interchangeable: `(frontend)/error.tsx` (offers `reset()` first and shows the
digest), `global-error.tsx` (the root layout itself failed, so **inline styles only** — it must
not depend on the stylesheet that might be what broke), and `global-not-found.tsx` (سنون has
two root layouts, so there is no single layout an app-wide 404 could compose from; needs
`experimental.globalNotFound`).

### Performance

Measured on a production build, Chrome throttled to Slow 3G with the CPU at 4x, 360px
viewport: **landing 287 KB / first paint 2.5s**, `/case/new` 280 KB / 2.5s, a second visit
1 KB / 0.5s. The typeface (IBM Plex Sans Arabic, self-hosted) is ~94KB and the single largest
thing سنون downloads — accepted deliberately, with `display: 'swap'` so nothing is blocked.

**A stale `.next` will lie to you.** `rm -rf .next` before measuring anything.

---

## عالجني, and why سنون will not diagnose from a photograph

The first Iraqi competitor. Two facts from Haider: **students buy patients on it**, and it
**claims AI-assisted diagnosis from photographs alone**.

**The first is the competitive answer and it is not close.** Selling patients to students is
what this file forbids in three separate places written before anybody knew عالجني existed. A
platform where a student pays for a case has changed what the case *is* — the patient becomes
inventory. سنون does not need to react; it needs to keep saying plainly what it does.

**The second: possible, not free, and disqualifying.** Vision models return a confident
paragraph about any intraoral photograph, and the confidence is not accuracy — interproximal
caries is invisible without a bitewing, so is anything periapical, and a phone photo adds bad
light, bad angle and no dry field. Every image is a paid API call. **And it would make سنون a
care provider**, ending the sentence this file opens with. There is a privacy cost too:
shipping intraoral photographs to a third party, against a codebase that strips their GPS,
serves them from behind an authorisation check and deletes them after sixty days.

**So سنون does the thing that actually helps and carries none of that: guided questions.**

**The case form asks what it can help with, not what hurts.** It opened with `شنو يوجعك؟` and
Haider corrected it: pain is not the common case. Most people arrive because a tooth has
stopped working, and a form that opens by asking where it hurts has already told those people
it is not for them. `بشنو نكدر نساعدك؟` covers everyone, and it is what a receptionist says.

---

## Future: the supplies store

A commission-based dental products marketplace, planned for later. **No owned inventory.**

**It is not advertised on the site** — a "coming soon" panel is a promise the site cannot keep.
Its place in the navigation model is held in `copy.ts` (`landing.supplies`). When it is built
it gets its own site and this one links across as advertising.

For now: do not build it, do not install `@payloadcms/plugin-ecommerce` (excluded), and keep
product/supplier concerns out of the case domain. Do not make assumptions in the auth or user
model that would block a customer who is neither a patient nor a student.

Also raised as an idea only: a **نظام سنون للعيادات**, a clinic-records system. Recorded so it
is not lost. **Do not design for it** — the one thing it must not do yet is shape the case or
auth model.

---

## Not in the MVP

Do not build these unless explicitly asked:

- the 3D/WebGL landing scene
- in-app chat between student and patient (they will use the phone)
- payments of any kind
- the marketplace
- automated verification of student documents
- **ratings or reviews *of students*** — see "Reviews of سنون" for what *is* built and why it
  is a different thing
- bidding, pricing, or any competitive mechanism between students
- a mobile app
- multi-language switching (Arabic only for now)
- web push notifications

---

## Open decisions — ask, do not assume

If a task depends on one of these, stop and ask rather than picking.

1. **Fair distribution.** Should a student who has already received several cases be
   deprioritised? Tracking is built (`/student/history`, `summariseClaimsByStudent`); the
   policy is not decided.
2. **External cases.** Students also find patients outside سنون. Self-reported counts should be
   visibly marked unverified and should not gate eligibility — but whether to collect them at
   all is open.
3. **Photo requirement.** Optional at submission — but should some treatments require one?
4. **The guided questions' clinical content is a DRAFT and must not launch unreviewed.** The
   machinery in `src/lib/triage/` is finished and tested; the questions, the answers and above
   all the three `referral` exits were written by Claude, which is not a dentist. **Haider is.**
   The referrals matter most — a missing exit sends somebody who needs a hospital into a queue.
   Also his call: whether the tree eventually moves into Payload so he can edit wording without
   a deployment.
5. **Can a fourth year treat a permanent tooth in a patient under fifteen?** If they can, the
   milk/permanent answer is load-bearing and needs a field on the case. **If they cannot, the
   question has no job and comes out.** It is asked and discarded today. Nothing should be
   built on it until that answer arrives.
6. **University choice by the patient.** After picking a city, should the patient narrow to
   universities they can reach? Transport across a city is the real obstacle in Iraq, so the
   information has value — but any filter shrinks the pool of students who can see a case, so
   the leaning is optional, multi-select, "any" by default, never required. **Blocked on real
   data**: which universities have dental colleges, and where. `docs/dental-colleges-draft.md`
   is web research to be corrected, not a decision. **Half answered**: almost every Iraqi
   dental college runs a teaching clinic taking outside patients, so a teaching clinic is not
   a filter.
7. **Which cities to launch in.** The 18-city list in `src/lib/config/index.ts` is a
   placeholder written by Claude, not a decision. Realistically the launch is one or two.
8. **Which universities charge for materials, and how much.** Answered in principle: some
   charge a **symbolic fee**, usually no more than **5,000 د.ع**, and the **student** states
   the exact price before treatment starts. `fees.long` in `copy.ts` says exactly that, in one
   shared string used in three places. Two consequences already applied — the promise card no
   longer says **مجاناً**, and the closing band no longer says "ما تحتاج حساب ولا فلوس". When
   the per-university detail is known it belongs in Payload, not `copy.ts`.

**Settled, recorded so they are not reopened:** case visibility is overlap not containment
(with the `paediatric` exception); the patient confirmation mechanism (the student's report
records but moves nothing, the patient's answer advances it, an admin resolves the stuck ones
— never a timer); retention periods (60 / 90 / indefinite); and the claim cap (one, adjustable
in Payload).

---

## Working style

- **Incremental.** No large unreviewed generations, no full-schema-in-one-shot. Commit one
  item at a time.
- **Explain architectural decisions before implementing them.** Never change agreed
  architecture silently — and when a rule here is reversed, say so in the file rather than
  editing it away, or somebody will "correct" it back.
- **Tests accompany anything touching claiming, state transitions, or access control.** Those
  three are where a bug harms a real person. A test for a bug should **fail on the old code** —
  check that it does.
- **Verify the way a user meets it.** In a browser, on the real page, with real Arabic content.
  Not with `curl`, not by reading the code, not from one screenshot. Run the database-backed
  tests with Postgres before pushing.
- **Be direct about what costs money, needs approval, or is not possible.** Say plainly what
  was not verified.
- **Deployment is from GitHub, never from Claude Code.** Push to the branch; Vercel builds it.

---

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from
your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from
this file's directory; in monorepos the `next` package may not be visible from the repo root)
before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only
re-creates the uncommitted change; committing it with your work keeps the tree clean.
