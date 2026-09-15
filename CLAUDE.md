# سنون / SNOON — Project Guide

Arabic-first platform connecting Iraqi dental patients who need accessible treatment with
4th- and 5th-year dental students who need supervised clinical cases for their university
requirements. Treatment happens at the university clinic, under university supervision.
سنون matches people; it does not deliver care and does not employ anyone.

**Brand name:** Arabic `سَنّون` — fatha on the س, shadda on the first ن — primary. Latin
`SNOON`, secondary, for the domain and nothing else.

**This reverses the earlier rule**, which said no diacritics and named `سَنّون` as a different
word. It is: `سنون` is a plural of سِنّ, and `سَنّون` is Haider's childhood nickname. He chose the
nickname, and it is his name to choose. Recorded here rather than quietly changed because the
old rule was stated as a non-negotiable and someone will otherwise "correct" it back.

Two things follow from it and are not optional:

- **The diacritics are part of the name, so they have to be typed, not drawn.** The string is
  six code points — `س` `U+064E` `ن` `U+0651` `و` `ن` — and every one of the fifteen Arabic
  faces tried renders it correctly. Nothing may hand-draw these letterforms as SVG paths: that
  is exactly how the generated logo Haider was shown ended up spelling a word that does not
  exist.
- **The Latin stays `SNOON`.** Briefly changed to `SOON` and changed straight back — Haider
  said "S and double O N", meant S-N-double-O-N, and corrected it as soon as he saw the
  wordmarks. Worth one line because `SOON` is the kind of thing that looks deliberate in a
  commit and is not: in English it reads as "coming soon", which on a logo says the site is
  a placeholder.

The site's own copy is **not** changed yet. Changing it is one edit to `copy.ts` once the logo
is chosen, and doing it before then would leave the product saying one thing and the mark
another.

**Say `منصة سنون`, not `سنون`, where the name names the thing.** `site.platform` carries it.
A bare "سنون" beside a hospital's name reads as a clinic, and the one thing this must never be
mistaken for is the place the treatment happens — سنون matches people and delivers no care.
It also leaves room for the other things that will carry the name: `متجر سنون`, and a
`نظام سنون للعيادات` if that ever happens. `site.name` stays the bare word, for running text
where سنون is the subject of a sentence.

**The wordmark carries a branch label.** `Wordmark` takes `branch`, and the landing page
passes `للمراجعين`. It is styled deliberately *unlike* the name — smaller, lighter, warm —
because it names a section of سنون rather than a second brand. `متجر سنون` and any clinic
system would use the same slot. It replaced the header's student link, which now lives only
in the hero's second button and the footer column: the landing page is the visitor's side of
the product and the header should say so.

**Never write `مريض` in user-facing copy. The word is `مراجع`.** Haider's instruction, and it
is the register a person uses about themselves when they go to a clinic — "مريض" labels
somebody as ill, which is not what a person filling in a form is there to be told. Applies to
`copy.ts`, `legal.ts` and every component. **`src/lib/cases/reasons.ts` is deliberately
excluded**: those strings are written into the case event log and are effectively an API, so
changing them splits the audit trail in two and leaves half of an admin's history in the old
wording. They are admin-facing and nobody outside the admin ever reads them.

**The shared pages address neither side directly.** Haider's instruction, and the reason is
that سنون had almost nothing on it aimed at students: the landing page said "الطالب راح
يتصل بيك", which silently tells every student reading it that the site is not for them. On
any surface both audiences see — the landing page, the fee sentence, the FAQ, the privacy
section — write the two roles in the third person: **"الطالب يتواصل وية المراجع"**, never
"يتواصل وياك".

This does **not** apply inside the patient-only pages. `/case/new`, the tracking page and
link recovery are read by one person whose role is not in doubt, and third person there would
be stiff and strange — "the student will contact the patient" on a form the patient is filling
in reads like a policy document. The rule is about the shared front door, not about every
sentence in the product.

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

`src/lib/config/` is split three ways and must stay that way.
`schema.ts` holds types and the fixed week and is safe for a Client Component;
`index.ts` reads Payload and is marked `server-only`, because importing it from a
Client Component pulls `fs`, `child_process` and the whole CMS into the browser
bundle and fails the build; `settings.ts` reads Payload but is **not** marked
`server-only`, because that guard also makes a module unloadable from plain Node —
which rules out scheduled jobs and CLI scripts. The contact-window expiry is
exactly such a job, so a guard there would break the thing it governs.

Two custom admin views read across into Drizzle: `/admin/students` reviews student
verification, and `/admin/cases` looks a case up by the reference code a patient reads out
over the phone — status, who claimed it, the appointment, and the full event log. The case
view is **read-only**: case state is changed by the lifecycle functions, which validate the
transition and write the audit row, never by a form in the CMS. Custom views get no nav
entry of their own, so both are linked from `beforeNavLinks`.

The privacy rule still binds inside the admin. `listRecentCasesForAdmin` has no contact
columns in its projection at all, so the overview cannot leak a phone number however it is
rendered; `findCaseForAdmin` is the only admin function returning them, and only for a
single case an admin typed the code for.

Reasons written to the case event log live in `src/lib/cases/reasons.ts` rather than as
literals at each writer. They are stored in the database, so they are effectively an API —
changing a literal in one file would split the history in two and leave half the admin's
audit trail untranslated.

**A custom Payload admin view must authorise itself.** Payload's admin gates the
*interface* — an unauthenticated visitor is shown a login screen — but a custom view is
still server-rendered, so anything it queries lands in the HTML whoever asked. `curl
/admin/students` returned every student's name, university and document reference to
anyone until the view started calling `payload.auth()` and returning null for non-admins.
Query nothing until the caller is known. The same applies to server actions reached from
such a view: being rendered inside the admin proves nothing about who calls the action.

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

Two edges the diagram does not show, both added later and both real:

- `MATCHED | CONTACTED → CANCELLED` when the claimant reports that whoever answered never
  asked for treatment. See "Nobody proves they own the phone number".
- `APPOINTMENT_CONFIRMED → REQUESTED` when one student finished the treatments their stage
  may perform and the case still needs another stage. See "Cases that need two stages".

Rules:

- Every transition is written to the case event log with actor, timestamp and reason.
- Transitions are validated server-side against an explicit allowed-transitions map. Never
  let a client send an arbitrary target state.
- `RETURNED_TO_QUEUE` restores the case to `REQUESTED` and records the failed claim, so the
  same student is not offered it again immediately.
- The patient must have a way to confirm whether contact actually happened. The student's
  word alone does not advance `MATCHED → CONTACTED` in a way that hides the case forever.

### After contact

`CONTACTED → APPOINTMENT_CONFIRMED → COMPLETED | NO_SHOW | CANCELLED` is driven by the
student on the case they hold, in `src/lib/cases/lifecycle.ts`. Notes worth keeping:

- **Appointment times are Baghdad time, always.** `<input type="datetime-local">` submits a
  wall clock with no zone, so the server decides what it means — and trusting the browser's
  zone would let a student whose phone is set elsewhere book a patient hours from the time
  they typed. Iraq has no daylight saving, so a fixed `+03:00` is correct.
- **Rescheduling supersedes rather than overwrites**, and a partial unique index allows only
  one live appointment per case, so a patient is never shown two times at once.
- **An outcome closes the claim** in the same transaction. Leaving it ACTIVE would keep a
  finished case counting against the student and keep the expiry job looking at it.
- **Contact details go away when the claim closes.** A student who has just completed a case
  sees a closed summary, not the patient's number — the grant was for the active claim.
- `expireStaleRequestedCases` only ever touches `REQUESTED`, so nothing mid-treatment can be
  swept up.

### Cases that need two stages

The two years do not treat the same things. From Haider, and seeded as each stage's default
in `src/payload/seed.ts`:

| | treatments |
|---|---|
| both years | فحص · حشوة · قلع · تنظيف |
| fourth year only | طقم جزئي |
| fifth year only | علاج عصب · طقم كامل · تقويم أسنان · أسنان الأطفال |

So a patient wanting a partial denture **and** a root canal needs a fourth year *and* a fifth
year, and neither can finish the case alone. Three consequences, all built:

1. **Visibility is overlap, not containment.** A case wanting a filling and a root canal is a
   fourth year's case for the filling. Hiding it because of the root canal would leave the
   patient waiting for a student who can do everything, and there is no such student. What
   their stage may not perform is **marked** in the queue rather than removed.
2. **The remainder is handed on, not duplicated.** `returnRemainderToQueue` puts the case
   back to `REQUESTED` carrying only what is still outstanding, and closes the first
   student's claim as COMPLETED. The case is not finished — it is a smaller case. Keeping one
   row keeps the patient's tracking link working, their number in one place, the photographs
   attached and the whole story in one event log. The visibility filter then does the rest:
   with only a partial denture left, only fourth years see it.
3. **What counts as "my part" is read from the server**, never from the form — a value a
   client could set would let a student hand back work their stage can perfectly well do.

**Seeding a stage's defaults is additive, and it used not to be.** `ensureStageDefaults`
returned early whenever a stage already had any defaults at all, so that re-seeding could not
overwrite an administrator's decision. The intention was right and the effect was a trap:
adding a treatment to the defaults in `seed.ts` did **nothing** to a database that already had
the stage. `fluoride` was created as a treatment type, stage 5 never gained it, and every case
asking for it would have been invisible to everyone — which is precisely the failure this
section calls out, because an empty queue reads as "no patients" rather than as a missing row.
Found by querying the database rather than by trusting "Seed complete".

It now adds what is missing and removes nothing. An administrator's *additions* survive; a
deliberate *removal* of a default comes back on the next seed, which is the right way round —
`defaultTreatmentTypes` is what a stage can do anywhere, and a clinic that genuinely differs
gets its own `stage-capabilities` row, which the seed never touches.

**Capability falls back to the stage's default.** `stage-capabilities` still holds per-clinic
rows for clinics that genuinely differ, but an absent row now means "whatever this stage can
do anywhere" rather than "nothing". Without that, adding a college hid every case from its
students until someone filled in the whole matrix by hand — and the symptom is an empty
queue, which reads as "no patients" rather than as a missing row.

### Days, and asking about a day the patient did not pick

A student is in clinic on the days their timetable says. A patient names the days they can
come. سنون collected both and matched on neither, so a student in clinic on Sunday could be
shown a case from a patient who could only come on Tuesday, claim it, ring, and find neither
of them could do anything — a wasted claim, a wasted call, and a trip back through the queue.

Requiring an overlap would be worse: it would hide most cases from most students. So:

- **Overlap → claim as usual.**
- **No overlap → the case is still shown, but cannot be claimed.** The student may *ask*
  instead, and asking grants nothing: no case, no phone number, no hold on the queue.
- **Only the patient's yes turns a request into a claim**, through the same conditional
  update an ordinary claim uses, so "a case can never be claimed twice" survives the second
  path into claiming.

`day_requests` holds **one row per day**, not per student. That is the question the patient
is actually answering — "can you come on Saturday?", not "do you want student X" — and it
settles two students wanting the same day without the patient ever choosing between people:
they are asked once, and the earliest asker wins. A partial unique index stops one student
asking the same thing twice.

Asked in both channels, because Telegram is optional: inline buttons in the bot, and the
same question on the tracking link. The callback payload carries the **day**, never the case,
for the same reason the contact buttons do — callback data is attacker-controlled, and the
case comes from the chat's own binding.

**The patient is told about this on the form**, next to the day picker. They cannot know that
students have a fixed university timetable, and without saying so a later "could you come on
Saturday?" reads as the site ignoring what they filled in.

`students.clinic_days` is empty for every student recorded before this existed, and empty
means "any day" — adding the field must not silently empty anyone's queue.

### The contact window

After claiming, the student has a limited window to contact the patient. **Start at 48
hours, not 24** — students are in clinic during the day and patients may not answer first
try. Make it a Payload-configurable setting, not a constant.

Expiry runs as a scheduled job, not a cron of one-off timers. Compute from
`claims.created_at`; never rely on a timer surviving a deploy.

**Both timed jobs run from one endpoint:** `GET|POST /api/cron`, which releases claims whose
contact window ran out and expires cases nobody ever claimed. It is a plain HTTP route on
purpose — a Vercel cron, a Dokploy cron running curl, or a systemd timer all drive the same
code, and where سنون ends up hosted is still open. `vercel.json` schedules it there.

**Once a day, not hourly, and that is a Vercel Hobby limit rather than a preference.** A
Hobby account refuses any cron expression that would fire more than once a day — the import
screen rejects `0 * * * *` outright with "Upgrade to the Pro plan", so an hourly schedule is
not a thing that quietly runs less often, it is a deployment that does not happen. The cost
is latency, not correctness: a contact window set to 48 hours expires somewhere between 48
and 72 hours, and a stale `REQUESTED` case sits at most a day past its date. Both jobs are
conditional updates guarded by the status they may come from, so running them once a day is
exactly as safe as running them hourly. If that latency ever matters more than the money,
the answer is not Pro — it is any external scheduler hitting the same URL with `CRON_SECRET`
as often as it likes, which is what the endpoint was built as a plain HTTP route for.

**And the functions run in Frankfurt, because the database does.** `vercel.json` sets
`regions: ["fra1"]`. Vercel's default is `iad1` (Washington), and the thing that actually
costs time is not the distance from Baghdad to the server — it is the distance between the
server and Postgres, because one page does several queries and each one pays the round trip.
Split across the Atlantic is the worst of the three arrangements; together in Washington
works; together in Frankfurt is the same arrangement roughly 80ms closer to the people using
it. **So the two must be changed together or not at all** — moving the Neon database without
this line, or this line without the database, makes سنون slower than leaving both alone.

It changes case state, so it is not public: `CRON_SECRET` must match, compared in constant
time, accepted either as `Authorization: Bearer` or `x-cron-secret`. It **fails closed** — an
unset or implausibly short secret refuses everything, because a deployment that forgot the
variable should have a job that does not run rather than an endpoint anyone can trigger.
`src/lib/cron-auth.ts` holds that logic so it is testable rather than buried in a route.

Running it twice changes nothing the first run did: every transition inside is a conditional
update guarded by the status it may come from, so two schedulers racing is safe.

**Nothing schedules it until the site is deployed.** Until then contact windows do not
expire on their own, and a case can sit claimed indefinitely.

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

### Security review, before deployment

A systematic pass over everything touching phone numbers, identity documents and
intraoral photographs. What it found and what changed:

- **A photograph killed the whole submission.** A server action's request body is capped at
  1MB by default, and the case form posts photographs through one. A 7MB phone photo died
  with an English "a server error occurred" and took the filled-in form with it — the exact
  failure the form-reset rule exists to prevent, on the most ordinary thing a patient does.
  `serverActions.bodySizeLimit` now fits the documented limits, and the browser applies the
  same limits before uploading, because a request over the cap is refused before the action
  runs and the server never gets to answer politely. Limits live in `src/lib/images/limits.ts`
  precisely so a Client Component can import them without pulling sharp into the bundle.
- **`isPatientLinked` and `isStudentLinked` were exported from `'use server'` files.** Every
  export from such a file is a public POST endpoint, whether or not it was written as one —
  these took an id and answered a question about it. They are plain queries now.
- **No security headers at all.** `next.config.ts` sets them: nosniff, an explicit
  `Referrer-Policy` (a patient's tracking token is in the URL and that page links out to
  Telegram), `frame-ancestors 'none'`, and `private, no-store` plus `noindex` on every page
  that carries contact details. There is still no `script-src` — Next and the Payload admin
  both inline scripts, so a real CSP needs nonces through both and is its own piece of work.
- The Telegram webhook secret was compared with `!==`. Both shared secrets now go through
  `src/lib/secure-compare.ts`.
- Payload access rules said "is anyone logged in", which is the same thing as "is an admin"
  only while `admins` is the only auth-enabled collection. `src/payload/access.ts` names it.

Verified as sound: Payload's REST and GraphQL both refuse `student-documents`, `case-photos`
and `admins` to an unauthenticated caller; the upload file routes return 403; every server
action resolves the acting student from the session and never from the form; nothing logs a
phone number, a document or a photograph.

**Rate limiting** covers the case form, sign-up, login, Telegram invites and the patient's
contact answer — `src/lib/rate-limit.ts`, keyed by the proxy's `x-forwarded-for`. In memory
on purpose: a shared store survives restarts and covers several instances and is worth
adding the day سنون runs on more than one, but a limiter that costs nothing and holds for a
single server beats a correct one that is not built. Successful attempts count too — limiting
only failures leaves the case that actually fills a disk unlimited. Login is keyed by address
rather than by email, because an email-keyed limit lets anyone lock a student out of their
own account.

### Nobody proves they own the phone number

A patient needs no account, which is the point — friction there costs the people this
exists to serve. It also means a case can name a number its owner never gave, and the first
that person hears of سنون is a student ringing about treatment they never asked for.

**There is no free way to prove ownership of a phone number.** An SMS code is exactly what
this project excludes and costs money per message. So the number is not verified, and the
design says so plainly: cap the damage before the call, and stop it in one tap after.

- **Before.** A number may hold a few open cases at once — a household shares a phone, and a
  mother submitting for herself and her child is ordinary — but not dozens, and not many in a
  day. Both caps are Payload settings. With the per-address rate limit, nobody can queue
  fifty calls to a stranger.
- **During.** The claimant's screen opens with what to say: identify yourself and سنون, and
  check the person actually submitted the request before discussing their case. That sentence
  is the real mitigation for the human moment.
- **After.** `reportWrongNumber` closes the case for good, releases the claim so it counts as
  neither finished nor failed, revokes the tracking token so whoever submitted it stops
  watching a stranger's data, and puts the number on a cooldown (`snoon.phone_blocks`).

The cooldown falls on the person who did nothing wrong. That is uncomfortable and still
right: it is the only handle that stops the same submission an hour later, it lifts by
itself, and an admin can lift it from `/admin/cases`. The refusal message is written for the
**real owner** rather than for whoever misused the number — if they ever come to سنون
themselves, they learn why they are refused and who to ask.

Deliberately **not** recorded: the submitter's IP on the case. It would be the only handle on
the person actually responsible, and logging every patient's address for a rare event is not
a trade data minimisation allows. Volume is already capped per address without storing
anything.

## Privacy rules

**Photographs.** Patients may upload intraoral images. **Built** — `src/lib/images/`.

- EXIF is stripped by `processCasePhoto`: `rotate()` bakes the orientation tag in, then the
  WebP re-encode drops all metadata because sharp writes none unless asked. This is the part
  that matters most — a phone photograph carries GPS, and publishing a patient's home
  coordinates alongside a picture of their mouth is a serious harm that is invisible unless
  something checks. `tests/image-processing.test.ts` builds an image that really does carry
  GPS tags and asserts they are gone, in the parsed metadata and in the raw bytes.
- Re-encoded to WebP, long edge capped at 1600px, never upscaled, 12MB in and at most four
  per case. Whatever arrived is decoded and rewritten, so a file that merely claims to be an
  image does not survive.
- Stored in `uploads/case-photos`, outside `/public`. Served only by
  `/api/case-photos/[photoId]`, which re-answers "who is asking?" every request — a session
  valid a minute ago proves nothing, and a student suspended since then stops seeing them at
  once. Three viewers are allowed: an admin, a **verified** student (before claiming too, since
  photographs are how they judge whether they can treat the case), and the patient carrying
  their own tracking token. Everyone else gets 404, not 403: whether a photo id exists is
  itself something only an allowed viewer should learn. `cache-control: private`, never
  shared.
- The upload warns in Arabic not to photograph the face, on the field itself.
- Admins can remove any image from the Payload admin.
- Deleted `photoRetentionDays` after the case reaches a terminal state, by the scheduled job.
  The row is kept and marked rather than removed, so a case that had photographs is
  distinguishable from one that never did.

**Contact data.** Phone numbers are the most sensitive field in the system. They exist to be
shown to exactly one student. Do not log them, do not put them in error messages, do not
include them in any list endpoint.

**Three legal shapes, and Arabic digits are one of them.** From Haider: 11 digits starting
`07`, or 10 starting `7`, or the international form — `+964`/`00964` then the 10 digits
without the leading zero. `normalisePhone` accepts all three plus spaces, dashes, and both
Arabic-Indic (`٠١٢٣`) and Extended Arabic-Indic (`۰۱۲۳`) numerals.

That last part is not a nicety. **عالجني rejects a number typed in Arabic digits** and tells
the patient their Iraqi number is invalid — Haider hit it himself, and it only worked once he
retyped in Western numerals. It is the purest example of a bug that is invisible to whoever
built it and blocks exactly the user this product is for: somebody on an Arabic keyboard.
Verified here by submitting a whole case typed in Arabic numerals, not by reading the parser.
**Never put a `pattern` on the phone input** — it would reintroduce the bug in the browser,
where the server's parser never gets a chance to be right.

---

## Authentication

**Students:** Better Auth with email and password. Email verification by link.

Then a manual verification step, because university email is not reliably available in Iraq:
the student provides proof of enrolment (student ID or registration document), and an admin
reviews it at `/admin/students` — a custom Payload view that reads across to the Drizzle
`students` table rather than duplicating the record into Payload. The document itself is a
Payload upload collection with `read` restricted to admins, stored outside the public
directory.

The document may arrive **two ways**: uploaded on the site, or photographed and sent to the
Telegram bot — which is far less work on a cheap phone, and this is the step students drop
off at. Both routes end in `attachVerificationDocument`, so the rules live in one place:

- Accepted only while the student is `PENDING` or `REJECTED`. A `VERIFIED` student must not
  be able to undo their own approval by sending another photograph, and a `SUSPENDED` one
  must not re-enter the queue on their own — reversing that is an admin's decision.
- A rejected student sending a clearer document returns to `PENDING` and the previous
  reviewer is cleared, since that decision no longer describes what an admin is looking at.
- Size is checked against Telegram's declared size *before* downloading and against the real
  bytes after, because the declared size is a claim from the same message the file came in.

Telegram never decides anything. It carries the photograph; the admin still approves.

Nothing requires Telegram: the site upload at `/student/profile/document` is always
available, and the document is optional at profile submission precisely so a student can
choose the bot instead. Status is `pending | verified | rejected | suspended`.
Only `verified` sees cases. Manual review is correct at this scale — do not build automated
document checking.

Sign-up does not reveal whether an address is already registered: Better Auth accepts the
request and quietly does nothing, so the form cannot be used to enumerate accounts. It also
creates no session while email verification is required. Both shape the flow — sign-up
redirects to a "check your email" page that also tells a student who already has an account
to log in instead, which covers the dead end without adding an oracle.

Email itself is **not configured**. That used to block student sign-up outright;
with "Continue with Google" below it no longer does, and what remains blocked is
only the password path.

`src/lib/email.ts` prints to the console in development and throws in production. Throwing is
NOT sufficient on its own: Better Auth sends its verification email as a **background task**,
so the failure never reaches the caller. Sign-up appeared to succeed, the account row was
written, no message went out, and the student was left holding an account they could never
verify or log into — silently. Verified by probing it.

So any flow that depends on a message arriving must check `isEmailConfigured()` **before**
writing anything. Sign-up does, and refuses with an Arabic "registration is not open yet"
notice rather than creating an unverifiable account. `tests/email-guard.test.ts` holds that
line.

**The provider is Resend** — free to 3,000 messages a month against a flow that will produce
a few dozen, and no AWS setup. Sent with plain `fetch`; one POST is the whole API surface
used, and a dependency in the server bundle to build one request is not worth it.
`isEmailConfigured()` now means `RESEND_API_KEY` and `EMAIL_FROM` are both set — neither half
alone counts, because a key with no from address cannot send and a from address with no key
is a deployment that believes it can.

The thing to know before launch is not in the code: **Resend delivers to arbitrary addresses
only once a sending domain is verified** in their dashboard. Until then it accepts mail only
to the account owner's own address — enough to test, not enough to open registration. So a
domain is now on the critical path for the student side. The patient side is unaffected and
works fully.

### "Continue with Google"

The fastest way into سنون, and — until a sending domain exists — the only one
that works in production. `src/lib/oauth.ts`.

Why it matters more here than it does for the competitor it was taken from:
password sign-up needs a verification email, email needs Resend, and Resend only
delivers to arbitrary addresses once a sending domain is verified. Google has
already verified the address, so there is **no message to send and nothing
waiting on a domain**. It is the one change that opens student registration
without one. It also fits the median user exactly: a low-end Android phone is
already signed into Google, so it is one tap, no password to invent and remember,
and no inbox to go and check on a slow connection.

Rules it holds to:

- **Students only.** Patients never get an account, and nothing here may ever be
  offered on the patient side — friction there costs the people this exists to
  serve.
- **It does not grant verification, and must never be made to.** Google answers
  "who owns this address?". Whether somebody may see a patient's phone number is
  `snoon.students.verification_status`, which an admin sets after reading an
  enrolment document. A student who signs in with Google lands on the same
  profile form as everyone else and sees no case until they are approved. The
  seconds saved are at the account step, which was never the hard part — the
  document is, and this leaves a student more patience for it.
  `tests/google-signin.test.ts` asserts that the profile mapper returns exactly
  `name`, `email` and `emailVerified` and nothing that could be read as a status.
- **The profile picture is dropped at the boundary.** Google returns a link to
  the user's photograph and Better Auth would store it by default. سنون shows no
  faces anywhere, so `mapGoogleProfile` does not keep it — a field needs a reason,
  not an opportunity.
- **`emailVerified` comes from Google's claim, not from the fact of signing in.**
  Google can return an account whose address it has not verified.
- **Account linking is left at Better Auth's defaults.** Its
  `requireLocalEmailVerified` default stops an attacker who pre-registered an
  unverified password account at someone's address from having that person's
  Google identity linked into the attacker's row on first sign-in. Do not relax
  it.
- **Driven from a server action, not Better Auth's browser client**, which would
  put the whole client in the bundle for one redirect. It is a plain form post:
  the tap works whether or not the JavaScript has arrived.
- The Google mark in `google-button.tsx` is **the one component allowed literal
  colours**. Google's terms require their mark in their four colours, and those
  belong to Google rather than to `tokens.css` — re-theming سنون must not touch
  them.

**The redirect URI is built from `BETTER_AUTH_URL`, not from the host the request
arrived on.** So `<BETTER_AUTH_URL>/api/auth/callback/google` is what must be
registered in Google Cloud, exactly, port included. A mismatch is refused at
Google's own screen with `redirect_uri_mismatch` before anything reaches سنون, so
there is nothing in our logs to explain it. Found by actually driving the button
in a browser, which sent `redirect_uri=http://localhost:3101/...` while the
server under test was on 3111.

Sign-up therefore has **three** states, not two, because two independent things
can each be missing: both configured shows both paths; Google alone shows the
button and says in Arabic that password sign-up is not open yet; neither shows
the closed notice. The middle one is where سنون actually is.

**Patients:** no account is ever required, and that must not change. Friction here directly
costs the people the platform exists to serve.

A submitted case returns a **case reference code** plus a signed tracking link the patient
can bookmark, letting them check status and confirm contact without logging in. Tracking
tokens are long, random, single-case scoped, and revocable.

### The link is the product; the account is a convenience

Two additions, both optional, both for the same problem: a patient with no account has
exactly one way back to their case, and losing the link used to mean losing the case.

**Link recovery — `/case/find`.** Reference code plus the phone number on the case. Neither
alone is enough; the code is not a secret (it is read out over the phone) and the phone is
what سنون is protecting, so the pair stands in for a password. `recoverTrackingLink` in
`src/db/queries/case-recovery.ts`. Rules it must keep:

- **One answer for every failure.** A wrong code, a wrong number, a case that never existed
  and a link that was revoked all return the same `{ ok: false }` and the same Arabic
  sentence. Any difference makes this an oracle for "does SN-4KP7QW exist" or "is this the
  number on it". An unparseable phone is simply a number that matches nothing, for the same
  reason.
- **It reissues rather than resends.** The database holds an HMAC of the token, never the
  token, so the original is unrecoverable by design. The old link dies — which is the right
  outcome anyway, since the usual reason somebody is here is that the old one ended up
  somewhere they no longer control.
- **A revoked link stays revoked**, or `reportWrongNumber` would stop working: it revokes
  the token precisely so whoever submitted a stranger's number stops watching that
  stranger's data.
- **A scrubbed case cannot be recovered.** The phone column is an empty string after the
  retention period, and an empty submitted value must never match it.
- **The rate limit is the security control**, not the comparison — someone holding one of
  the two values could otherwise walk the space of the other. Ten an hour per address.
- The phone is **not** handed back to the form on failure, against the general rule that a
  rejected form keeps what was typed. Two fields is not a case form, and echoing a number
  into the HTML of a page that just refused is how it ends up in a shared phone's cache.

**The optional patient account — `/case/mine`.** Google only, because the entire
justification is that it costs seconds; a password plus a verification email is neither.
`cases.patient_auth_user_id`, null on most rows, and that is the normal path.

- **Nothing may require it, and no student-facing or admin query may branch on it.** A case
  with an account and a case without are the same case.
- **It is attached two ways**: at submission, from the session and never from the form; and
  afterwards from the tracking page, where **the tracking token is the proof of ownership**.
  The second is the one that matters — the realistic order of events is submit, get a link,
  and only later decide you would rather not depend on it.
- **Holding the link does not take a case off an account that already has it.**
- **The retention scrub nulls the link** along with the name and the phone. An account row
  carries a real name and a real address, so leaving it would keep the case attached to an
  identified person months after the details on it were deliberately erased, and make the
  scrub cosmetic. The case then drops out of that patient's list, correctly: there is
  nothing left to show them.
- `listCasesForPatient` has **no contact columns in its projection**, the same discipline the
  student-facing queries follow.
- There is deliberately **no sign-in button on `/case/new`**. A sign-in prompt on a medical
  form reads as a demand however it is worded, and the case form is the one thing in سنون
  that must never acquire a step.

`tests/patient-account.db.test.ts` holds all of the above against a real database.

Raised at the time and recorded because the reasoning still applies if this is ever revisited:
a patient account is a poorer fit than it looks — a household shares a phone, so the Google
account on it may not belong to whoever is submitting; plenty of Android phones here were
signed in once by a relative; and an account is an email address kept indefinitely for
someone whose case details we deliberately erase at ninety days. Haider weighed those and
chose to offer it anyway, optional and alongside link recovery. Optional is what makes that
safe, so it is the part to defend.

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
- **The identity now exists**, and still lives entirely in `src/styles/tokens.css`. Components
  reference `var(--…)` and never a literal colour, font or radius, so the whole product is
  re-themed by editing that one file. A deep teal rather than the corporate blue every clinic
  site uses, with a warm sand beside it — سنون asks people who cannot afford a dentist to
  trust it with a photograph of their mouth, and cold is the wrong register for that.
  If a colour is wrong, it is wrong there. Do not add one to a component.
- **The typeface is IBM Plex Sans Arabic**, self-hosted by `next/font` at build time so
  nothing is requested from Google at runtime. It costs about 94KB, which is the single
  largest thing سنون downloads — see the performance note below for why that was accepted.

### The shared vocabulary — build from it, do not restyle locally

Pages used to style themselves. A dozen places each wrote out
`flex min-h-11 items-center justify-center rounded-md bg-accent …` by hand and
they had already drifted — different heights, radii, some with a shadow. Nothing
was individually wrong and nothing lined up, which is most of what made سنون read
as a form rather than a product.

There is now one set of pieces, and new work uses them rather than adding a
fourteenth variant:

- `components/ui/button.tsx` — `buttonClass(variant, extra)` and `ButtonLink`.
  Returned as a class string, not a component, so it works on a `<button>`, a
  `<Link>` and a bare `<a>` without three wrappers, and so a Client Component can
  use it without dragging the server in. Four variants; **at most one `primary`
  per screen**.
- `components/ui/card.tsx` — `Card`, `CardBody`, `CardRibbon`, `Chip`, `MetaRow`,
  and `statusTone`, which maps every lifecycle state to a colour. The labels stay
  in `copy.ts`; only the colour lives here.
- `components/ui/icon.tsx` — the icon set, drawn inline. A few hundred bytes
  inside HTML already being downloaded, against tens of kilobytes and a second
  request for an icon font. All `aria-hidden`: the text beside them carries the
  meaning.
- `components/ui/field.tsx` — `FormSection`, `labelClass`, `controlClass`,
  `optionClass`. **Every input in سنون comes from here**, including the auth and
  profile forms, which used to define their own.
- `components/site-chrome.tsx` — `SiteHeader`, `SiteFooter`, `PageShell`. Until
  this existed only the landing page had chrome and every other page opened on a
  bare grey `سنون`, so the pages people actually spend time in looked like forms
  somebody sent them.
- `components/ui/section.tsx` — `Section`, `Eyebrow`, `PageHeader`.

**The card anatomy is taken from ClinMatch's listing card** and every part of it
has a direct equivalent here: a status ribbon in the status's own colour, the
reference code in small type, treatments as chips, then location, days and date
as icon rows. What was deliberately not taken: their "Featured" pill (an ad slot,
and the mechanism by which a matching platform becomes a marketplace), their view
counter (a patient's case is not content with an audience) and their price band.
See `docs/competitors.md`.

**Colour is never the only signal.** A ribbon carries a colour *and* its Arabic
label, because it has to survive a cheap screen in daylight and a reader who
cannot distinguish the hue.

**Prettier is not the house style.** There is no config, its defaults disagree
with the codebase on semicolons and quotes, and running it on a file rewrites
every line of that file. Match the surrounding code by hand.

### Error pages

A crash showed Next's own screen: English, left-to-right, "Application error: a client-side
exception has occurred", to someone halfway through submitting a case with no idea whether
it was saved. Three files now cover it, and they are not interchangeable:

- `(frontend)/error.tsx` catches a throw inside the site. It offers `reset()` first, which
  re-renders the segment without a full load — the right first try on a flaky connection —
  and shows the error digest, the only thing connecting "it broke for me" to the server log.
- `global-error.tsx` is for when the root layout itself failed, so it renders its own
  `<html dir="rtl">` and uses **inline styles only**: it must not depend on the stylesheet,
  which might be what broke.
- `global-not-found.tsx` answers URLs that match no route. A `not-found.tsx` inside a route
  group only answers `notFound()` calls in that segment, and سنون has two root layouts — the
  site and the Payload admin — so there is no single layout an app-wide 404 could compose
  from. It needs `experimental.globalNotFound` in `next.config.ts`, and it bypasses the
  layout, so it imports the stylesheet itself.

### Motion, and the tools that were not used

Haider asked whether an AI site builder — blink.new was the example — could
design سنون, or "any other tool that produces unique animated websites". The
answer recorded here because it will be asked again:

**Not that class of tool.** blink.new and its siblings (Lovable, Bolt, v0) are
app *generators*: they write a codebase, provision a database and authentication,
and host the result. سنون is not a landing page. It is a case lifecycle with
atomic claiming, an access-control table enforced by projection types, EXIF
stripping, retention scrubbing, two-stage case handoff, day matching and 547
tests — and the privacy rules that make it safe to point at real patients are
exactly what a generator has no way to know about. Pointing one at this repo
does not design it; it replaces it.

Where such a tool **is** genuinely useful is the same place ClinMatch and
AsnanLink were: as a source of visual ideas. Prompt it, screenshot the result,
and treat the screenshots as reference — see `docs/competitors.md`.

**The want behind the question was right, and is answered in CSS.** Motion is in
`src/styles/motion.css`. No JavaScript, no library, no second request.

The arithmetic is most of the argument, and it is worth stating with figures that were
actually measured rather than remembered. **Corrected:** this file said "GSAP roughly 70KB
gzipped", which was wrong — 72KB is the *raw* minified size of the core. Measured from
cdnjs, gzipped, which is what the wire carries:

| | gzipped |
|---|---|
| `gsap` core | **28 KB** |
| `ScrollTrigger` | **18 KB** |
| `Flip` | **9.5 KB** |
| framer-motion | ~50 KB |

So GSAP core plus ScrollTrigger is **46KB against a 287KB page** — a sixth more, and the
second largest thing سنون downloads after the typeface. Real, but not the four-times
overstatement the old number implied. **GSAP is also free now**, plugins included, since
Webflow acquired it; "the paid plugins" is no longer a reason.

**The size is no longer the main argument. This is:** every scroll effect on this page runs
on a `view()` or `scroll()` timeline, which the browser drives **off the main thread**.
ScrollTrigger drives the same effects from a scroll handler **on** the main thread. On the
4x-throttled cheap Android this project exists to serve, swapping CSS scroll timelines for
ScrollTrigger buys nothing visually and makes the scrolling worse. It would be 46KB spent to
go backwards.

**And one plugin is actively unsafe here:** SplitText splits text per character, which breaks
Arabic letter joining — the rule this file states twice. Never point it at Arabic.

**Where GSAP genuinely earns its place — and it is the only place:** `Flip`, for the
shared-element page transition that React's `<ViewTransition>` cannot give us yet. That is a
real capability CSS has no answer for. What buys it without charging the median user is the
tier gate — `data-motion` is decided before first paint, so the script loads **only at
`full`, and only once the browser is idle**. A weak phone downloads nothing, measured.
**Built** — see "the shared-element morph" below. Nothing else here uses GSAP, and the
argument above is why: every scroll effect stays in CSS.

### Three tiers, chosen before the first paint

Haider's follow-up was the right one: keep this for middling phones, drop it for
weak ones, and give a capable device something much stronger. `[data-motion]` on
`<html>` selects between:

| tier | who gets it | what it is |
|---|---|---|
| `none` | ≤2GB, ≤4 cores, data saver, or a reduced-motion preference | nothing moves; no rule in `motion.css` applies |
| `standard` | **the default, and every unknown** | staggered entrance, scroll reveals, the drawn line, press and lift |
| `full` | ≥8GB and ≥8 cores (or ≥8 cores and a fine pointer where `deviceMemory` is unimplemented) | a drifting three-layer gradient mesh, the headline a word at a time, parallax depth on scroll, richer reveals, a glowing line tip |

Measured on the same Slow 3G rig, all three: **267 KB, first paint 2.2–2.3s,
loaded 6.8s.** `none` runs **zero** animations at runtime; `standard` thirteen;
`full` sixteen.

Things worth not undoing:

- **The decision runs as an inline script in `<head>`**, not an effect.
  `src/lib/motion-tier.ts` holds it as a string. An effect runs after paint, and
  on a slow connection the page is painted long before React arrives — which is
  exactly this visitor. Next's own "preventing flash before hydration" guide is
  this pattern.
- **`standard` is the server-rendered default and every fallback.** JavaScript
  disabled keeps it; React's Strict Mode remount in development resets `<html>`
  to it; an unrecognised browser stays on it; a thrown exception leaves it. The
  free tier is the floor, never the expensive one and never nothing.
- **The gate is `:not([data-motion='none'])`, not a list of the two tiers that
  animate.** Everything that starts at `opacity: 0` must fail towards visible, so
  an attribute that is missing or momentarily cleared shows content rather than
  hiding it.
- **The full tier's CSS lives in the same stylesheet everyone downloads**, which
  looks wrong and is not. It is about a kilobyte compressed; a second stylesheet
  fetched only by capable devices would cost a 400ms round trip before a byte
  arrives, against roughly twenty milliseconds of transfer. The separate file is
  the more expensive option, and expensive for exactly the phone being protected.
- **`deviceMemory` is capped at 8 by spec** to limit fingerprinting, so `>= 8`
  means "8GB or more". `hardwareConcurrency` alone is a weak signal on Android,
  where mid-range chips report eight cores of which four are small — it only ever
  promotes a device in combination with memory or a pointer.
- **`?motion=none|standard|full` overrides the detection**, so a tier can be seen
  on a real phone rather than inferred. It matches those three literals only: the
  value goes straight into an attribute that selects CSS.
- **Arabic is split per word, never per letter.** Arabic shapes each letter
  according to its neighbours inside a word, so wrapping letters individually
  breaks the joins and renders a headline as disconnected forms. Words shape
  independently, so splitting on spaces is safe — and it is the only split this
  codebase should ever do to Arabic text. The split is server-rendered, so even
  the full tier's headline effect involves no JavaScript.
- Deliberately **not** read from client hints. The server could be told the
  device memory by header, but reading headers in the root layout opts the whole
  app out of static prerendering, and a statically served landing page is worth
  more to a patient on a slow connection than a perfectly chosen tier.

`tests/motion-tier.test.ts` runs the real script string against a fake browser —
it ships as a string, so it is neither type-checked nor linted, and that is the
kind of code that rots quietly.

Rules it follows, and which new motion must follow too:

- **Transform and opacity only.** Both composite on the GPU. Animating height,
  top or margin is where a cheap Android starts to stutter.
- **Never hide content that motion might not reveal.** The scroll-driven rules
  live inside `@supports (animation-timeline: view())`, and the `opacity: 0`
  starting state is set *inside* that gate — so a browser without support shows
  the text plainly. A missing animation must degrade to visible, never to blank.
  That ordering is the safety property; putting the starting state outside the
  gate would blank the page on an unsupported browser.
- **`prefers-reduced-motion` wins**, and the global rule zeroes delays as well as
  durations. Verified: under the preference nothing on the landing page renders
  below half opacity at first paint, while the same page without it starts with
  seventeen elements hidden and animates them in.
- **A scroll-driven animation does not finish — it freezes where the reader
  stopped.** This is the property to keep in mind above every other rule here,
  and getting it wrong produced the worst bug of the design work: at the `full`
  tier a third of the screen sat permanently blurred, because cards were still
  inside a long `animation-range` when somebody stopped scrolling. A `view()`
  timeline is tied to scroll position, not to a clock, so a half-played reveal
  stays half-played indefinitely. Two consequences, both now enforced:
  **every reveal range ends inside `entry`**, so an element is fully resolved by
  the time its top edge finishes entering the viewport; and **only properties
  that stay readable half-applied may be animated** — opacity and a small lift
  qualify, `filter: blur()` does not. Blur was also a violation of this file's
  own first rule, since it is not a free compositor property. The one range left
  deliberately long is the line down the "how it works" steps, where tracking the
  reader *is* the effect. `frozen.mjs`-style checking — stop at many scroll
  positions and assert nothing on screen is part-drawn — is how this was caught
  and is worth repeating after any change here.
- **A full-page screenshot will tell you the page is broken when it is not.**
  Playwright's `fullPage` capture does not drive a scroll timeline, so every
  section below the fold comes back blank — the landing page photographs as a
  headline followed by two thousand pixels of empty grey. That is the tool, not
  the page. Verify scroll-driven work by actually scrolling: step down the page,
  screenshot the viewport at each stop, and run the part-drawn sweep. Judging
  this from one tall image is how somebody "fixes" an animation that was fine.
- **A tier has to be visibly different or it is not a tier.** The first attempt
  failed this, and Haider's verdict was exact: "there is not a lot of difference
  between the normal and the strong — it's only the header." The mesh and the
  parallax were tuned so far down that on a phone the only visible difference was
  the headline arriving a word at a time. The fix was not more effects but
  **sequence**: at `full` a grid reveals its cards one after another
  (`.stagger`, driven by shifting `animation-range` per child rather than by a
  delay, which would fight the scroll timeline and stall if somebody stopped),
  and section headings draw their own rule (`.rule-in`, animating `clip-path` so
  nothing reflows).
- **The second full-tier pass**, after "أريد يكون فعلاً قوي". The rule it follows is that
  every addition has to be something the standard tier does not do *at all*, rather than more
  of the same effect: a mote travelling the bridge curve on an `offset-path`, the badge's ring
  breathing, section headings arriving from the start edge instead of from below, cards
  tilting up from a bottom origin, and chips scaling in. Peak concurrent animations on the
  landing page: **52 at standard, 71 at full.**
- **The mote is the only loop in سنون**, and a deliberate exception to "nothing loops in the
  reader's peripheral vision". The picture's whole claim is that something passes between two
  people; a still line asserts that, a moving one shows it. It is 4.5 units on a 340-unit
  drawing, it moves at walking pace, and it is inside a figure the reader is already looking
  at.
- **Never use the `animation` shorthand on anything inside `.stagger`.** The shorthand resets
  every animation longhand it does not name, `animation-range` included — and the per-child
  ranges that drive the stagger are set by an equally specific rule earlier in the file. Doing
  this reverted every staggered child to the default `cover 0% cover 100%` range, which only
  completes once an element has scrolled off the *top*, so a chip sitting in the middle of the
  screen sat frozen at six per cent opacity. It is the frozen-reveal bug in its least obvious
  form: nothing about the CSS looks wrong. Use `animation-name`. The part-drawn sweep is what
  caught it, and is the reason to keep running it.
- **The register is calm.** This site asks people who cannot afford a dentist to
  trust it with a photograph of their mouth. Nothing bounces, nothing spins,
  nothing slides in from off-screen, and nothing loops in the reader's
  peripheral vision while they are trying to read. The page should look like it
  is settling, not performing.
- Hover effects are behind `@media (hover: hover)`: on a touch screen `:hover`
  sticks after a tap and leaves one card looking selected for no reason.

The 3D/WebGL landing scene is still out — see "The landing page" below. This is
what replaces it, at a cost that can be stated in kilobytes.

### Measured on a slow phone

Non-negotiable 7 is a claim, so it was measured rather than assumed: a production build,
Chrome throttled to Slow 3G (400kbps, 400ms RTT) with the CPU at 4x, on a 360px viewport.
Transfer is the wire size — `content-length` is reported decoded and overstates a gzipped
response several times over, which is the whole question on a slow connection.

| page | transferred | first paint | loaded |
|---|---|---|---|
| landing | 167 KB → 269 KB → **287 KB** | 1.7s → 2.1s → **2.5s** | 4.8s → 6.8s → **6.9s** |
| `/case/new` | 172 KB → 269 KB → **280 KB** | 1.7s → 2.0s → **2.5s** | 4.9s → 6.8s → **6.9s** |
| tracking, with a photograph | 194 KB | 1.7s | 5.3s |
| `/case/new`, second visit | 1 KB | 0.5s | 0.6s |

The second numbers are after the design pass, and the difference is almost entirely the
typeface: about 94KB across four files. It was accepted deliberately rather than by accident.
`display: 'swap'` means text paints in the fallback at first paint and the real face swaps in
later, so **nothing is blocked** — first paint moved 0.4s, not four seconds — and a returning
visitor pays none of it. The alternative was a product that looks unfinished to the students
it needs to recruit. If that trade ever looks wrong, it reverses by changing two lines in
`layout.tsx`.

The one real failure it found: **a case with photographs took 23 seconds and 1.1MB**, because
the grid showed them at about 170px wide and was sending the full 1600px file. Payload now
generates a 480px `thumb` on upload and `/api/case-photos/[id]?size=thumb` serves it —
same authorisation, falling back to the original when a photograph predates the size, so a
missing thumbnail is slow rather than broken. That is 194KB and 5.3s.

Worth knowing when changing anything here:

- **A new image size needs a Payload migration.** The sizes are columns on the upload
  collection; without `payload migrate` the size is silently not generated.
- **A stale `.next` will lie to you.** Twice during this work a build served an older bundle
  and the thumbnail appeared not to be generated at all. `rm -rf .next` before measuring
  anything.
- Upload is the patient's cost, not download: at 400kbps a 12MB photograph is roughly four
  minutes. Raised with Haider and **kept at 12MB** — photographs are optional, so a patient
  on a slow connection can simply not send one, and a limit that rejects a real photo is
  worse than one that is occasionally slow.

### The landing page

**It was too short, and that was the real problem.** Haider compared it against
ClinMatch and AsnanLink and said the obvious true thing: theirs are several times
the length of ours. The gap was never polish — the page answered almost none of
the questions a patient arrives with. Four sections were added, and each exists
because a real question had no answer:

- **What can I get?** — the treatment list, read from Payload. A patient's first
  question is whether their problem is covered at all, and سنون never said.
  ClinMatch puts the same chips in their hero.
- **What happens to my number?** — the one section neither competitor can write,
  because neither does the work behind it. Every line is something the code does:
  one student ever sees the number, and only after claiming; GPS is stripped from
  photographs; contact details are erased after the retention period; nothing is
  collected that matching does not need.
- **Does it work where I live?** — the city list, also from Payload, and with it
  the plain admission that سنون is new and some cities will be quiet. A patient
  who hears nothing should know why rather than assume the site is broken.
- **An FAQ**, as native `<details>`. Both competitors script their accordion;
  this one needs no JavaScript, works before hydration, and is already understood
  by a screen reader.

Then a second pass, after Haider looked at it on a phone: **visual elements**,
because the page was still text in boxes. The hero gained `MatchMotif` — two arcs
rising from opposite corners to meet, which is the product's own idea drawn as a
shape rather than decoration, and the answer to a hero with nothing to look at
when سنون has no photography and should acquire none. Each safety point and each
step gained its own icon instead of four identical ticks. The mesh was calmed at
the same time: the warm layer at 0.4 opacity read yellow-green and muddy against
the teal rather than warm, and now sits at 0.16.

The page reads Payload now, so it carries `revalidate = 300` like `/case/new`.
Cost of roughly tripling the content and adding the artwork: **277 KB against
267**, first paint 2.5s against 2.3s. The bridge, the footer columns and the
extra motion rules took it to **285 KB**, first paint 2.6s — eight kilobytes for
the picture that explains the product. The copy pass, the stronger full tier and the step
cards land it at **287 KB**, first paint 2.5s.

**Three things were cut from this page, all on Haider's instruction and all worth not
re-adding:**

- **The row of four ticks under the hero.** ✓ سنون مجاني · ✓ العلاج بعيادة الجامعة · … It
  said nothing the three promise cards above it had not, and it spent the tick — which is
  doing real work on the treatment chips — on filler. A tick everywhere is a tick nowhere.
- **"متجر سنون — قريباً".** A promise the site cannot keep; see the store section.
- **The stage caveat under the treatments** ("not every treatment is available at every
  stage…"). True, and detail nobody needs before submitting: the matching already handles it.

**The hero's picture is the hero.** It sat under the buttons, four scrolls down on a phone,
which made it an illustration of something the page had already finished saying. It is now
beside the headline from `md` up and directly under it below that — the first thing a visitor
looks at, explaining سنون before they read a word, which is what it was drawn for. Placement
is explicit `col-start`/`row-start`, not `order`: three children in a two-column grid wrap,
and `order` only re-sequences them into the same wrong cells.

**The three UI libraries in the reel Haider sent — Animaster Lib, Skiper UI, Vengance UI.**
Asked whether they could make something visually astonishing. Recorded because the question
will come back:

- **They are not installable dependencies.** They are shadcn-style "copy the component into
  your repo" collections, most of the good parts behind a PRO paywall, and what they copy in
  is React components built on framer-motion, GSAP and — for the WebGL shader ones —
  three.js. three.js alone is around 150KB gzipped against a 287KB page.
- **The register is wrong, and that matters more than the weight.** Their house look is
  dark-mode agency: neon shaders, scrambling type, cursor trails, a spinning 3D object over
  near-black. سنون asks people who cannot afford a dentist to trust it with a photograph of
  their mouth, and this file already records that the register is calm. A nightclub hero
  would not read as premium here; it would read as a different company.
- **Two of their categories are pointless for this audience** — Mouse Effects and Hover
  Effects are pointer-only, and the median user is on a touch screen.
- **What is worth taking is the composition, not the code**: the picture as the hero rather
  than as a footnote (done), and **page transitions**, which is the one thing in that list
  that would genuinely raise the product and costs nothing — the View Transitions API is
  native. Note before starting it: `ViewTransition` is not exported by the installed
  `react` 19.2.8, so it would come from the canary React that Next bundles for the client,
  and that needs verifying rather than assuming. It also could not be judged in the
  single-file preview, which had no navigation at all — **the preview now carries both the
  landing page and the case form and swaps between them**, precisely so the morph can be felt
  on a phone before there is a deployment. See below.

**The steps are a rail, not a stack.** Haider's note, and it is right twice over: four cards
stacked is four screens to scroll past before the page continues, and a sequence laid out
side by side reads as a sequence. One card in view with the next peeking, swiped through,
snapping — native `scroll-snap`, nothing scripted — and four across with no scrolling at all
from `md`. It is also the shape ClinMatch uses for the same content.

The progress bar under it is driven by `scroll-timeline: --snoon-rail inline` on the rail and
`timeline-scope` on the section. A **named** timeline, not `scroll(self)`: the bar is a
sibling of the rail rather than a descendant, so it has no scrollable ancestor to read, and a
named timeline published by the rail is the only way to drive it. Its fallback is
`inline-size: 100%` — a progress bar stuck at zero looks broken, one stuck at full reads as
"nothing to scroll here".

**Page transitions: what is actually possible, and what is not.** Asked for after the
four-card motion reference. Checked rather than assumed:

- **React's `<ViewTransition>` is not available.** `react` 19.2.8 does not export it, and
  Next's bundled `react-experimental` has it only as a symbol. Using it means putting the
  whole app on React experimental, which is not a trade this product makes for an animation.
- **The CSS-only `@view-transition { navigation: auto }` is cross-document**, so it does not
  fire on Next's client-side navigation. Getting it would mean replacing `<Link>` with plain
  `<a>` — losing prefetch, and making the browser hold the old page until the new one is
  ready. On a 400kbps connection that is a frozen screen, which is non-negotiable 7 traded
  away for a flourish.
- **What is built instead:** `.page-enter` on every page's `<main>`, in `PageShell` and on
  the landing page. The arriving page fades and lifts over 260ms on mount, which is when the
  App Router swaps the segment. Not a shared-element morph, but navigation reads as a move
  rather than a cut, and it keeps client-side routing and prefetch. Revisit when
  `<ViewTransition>` ships in stable React.

**And then the shared-element morph, with GSAP Flip.** Asked for directly — "نكدر نستعمل
GSAP؟", then "سويه". `src/components/page-transitions.tsx`. Tapping the landing page's primary
button makes it *become* the case form's heading: it travels up the screen and grows into it,
rather than one page cutting to another. It is the one effect in that whole reference
catalogue that CSS here has no answer to, and it is the case this file already named as where
GSAP would genuinely earn its place.

The reason it is affordable is the tier gate, and the gate is the point rather than a detail:

- **Three gates, in order, before a byte of GSAP is fetched.** `data-motion === 'full'`; no
  `prefers-reduced-motion`; and the import runs inside `requestIdleCallback`, so it never
  competes with anything on the critical path. The `import()` is dynamic so it becomes its own
  chunk, and a chunk is only fetched when the import runs.
- **Measured, same build, same 360px viewport:** `none` **283 KB / 18 requests**, `standard`
  **283 KB / 18 requests**, `full` **322 KB / 21 requests**. The two cheap tiers are
  byte-identical — the median phone this project exists to serve downloads nothing for this.
  Slow 3G on the landing page is unchanged at **284 KB, first paint 2.6s**.
- **Everything degrades to the `.page-enter` fade.** GSAP not loaded yet, the destination
  missing its half of the pair, anything thrown — the navigation is an ordinary one. A
  transition is the last thing that may ever break a link.

Two findings worth not rediscovering:

- **`absolute: true` is the obvious setting in `Flip.from` and it was wrong here.** Lifting the
  heading out of flow for the flight let the rest of the arriving page collapse upwards by its
  height and then drop back when it landed — a jolt through the whole form, on the one page a
  patient must never find unsettling. In flow, the destination is laid out correctly from the
  first frame and only the heading moves. Keep `scale: true` (size by transform, so the flight
  stays on the compositor) and leave `absolute` off.
- **Capture on `click`, in the capture phase — not on `pointerdown`.** `pointerdown` fires for
  taps that never become navigations: a drag away, a modified click that opens a new tab. Each
  one left `data-flipping` set on `<html>`, which suppresses the CSS fade for *every later
  navigation*, and left stale bounds in `pending` so the next flight would start from somewhere
  the reader never tapped. Capture-phase `click` runs before Next's own handler while the old
  page is still on screen, and modified clicks are skipped. A 1200ms expiry then clears any
  capture whose navigation never arrived, because a click can still be cancelled downstream or
  a route can fail. Verified by blocking the navigation in a capture listener and watching
  `<html>` come back clean.

**The preview artifact carries two pages now**, built by `snapshot.mjs` in the scratchpad.
Three things about it that are easy to get wrong a second time:

- **It loads GSAP from cdnjs, behind the same gate as the real site** — `full` tier only, and
  only once the browser is idle. A preview that always loaded it would misreport what a given
  phone actually gets, which is the one question the preview exists to answer.
- **The second page rides in a `<script type="text/html">` block**, with `</script>` escaped
  inside it. Anything else and the case form's own markup closes the tag early.
- **Nothing in a preview may submit**, so `submit` is cancelled globally — and the send is
  then *played*: the spinner runs, and after a beat the real success card appears. Only that
  one card is lifted from a real submission, never the page around it, because that page
  carries a name, a number and a live tracking token. `successcard.mjs` refuses to write the
  file if anything matching a phone number or a token is inside it, and `previewsend.mjs`
  checks the built preview again.
- **The pending label is read from the button's `data-submitting`**, not copied into the
  preview script. One string in `copy.ts`, so the preview cannot drift from the product.

### The five tool cards, and what was taken from them

Haider sent five: backgrounds.supply, transitions.dev, deck.gallery, godly.design,
animos.app — asking which could be used, and for "something premium for the strong version".
Fetched rather than judged from the cards. **One of the five has anything that goes into this
codebase.**

- **transitions.dev — yes, and free.** 37 transitions outside the paywall, as CSS and React
  snippets. Most are wrong here for reasons this file already states: pointer-only ones
  (3D tilt with cursor glare, avatar-group hover, card-stack hover) miss a touch-screen
  median user; the accordion animates `height`; confetti on a medical form is grotesque; and
  the loops (shimmer text, organic shimmer) are what "nothing loops in the reader's
  peripheral vision" exists to exclude. **Three were taken** — success check, spinner-to-check
  and error-state shake — and all three were rewritten rather than copied, because theirs
  animate `filter: blur()` and `height`.
- **godly.design — yes, but not as code.** A free gallery, the same use as ClinMatch and
  AsnanLink in `docs/competitors.md`: reference, screenshotted, never pointed at this repo.
- **backgrounds.supply — no.** $49 one-off for 1,273 background *image files*. A single one
  is a multiple of what this whole page weighs, and their house look is dark neon, which is
  the register argued against twice above. Genuinely useful for Instagram and launch
  graphics, which is a different problem.
- **deck.gallery — not for the site.** Presentation decks. Worth keeping for the day a dental
  college has to be pitched.
- **animos.app — not for the site.** It exports MP4s of a design. A marketing tool.

**What was built, and why these three.** All from the free tier, all in CSS, no library, and
each one attached to a moment that had nothing:

1. **The spinner in the submit button.** `useFormStatus` already swapped the label; on a
   400kbps link with a photograph attached, nothing else on screen moved for several seconds.
   The ring is the only loop in سنون besides the bridge's mote, and the exception is the
   opposite of the mote's: this is not peripheral, it is the thing somebody is staring at
   while they wonder whether the site has died. Under `prefers-reduced-motion` and at `none`
   it sits still and the words carry it.
2. **The tick that draws itself on `?new=1`.** The single most important screen in the
   product — a patient has just handed over a phone number and a photograph of their mouth —
   and it opened with a paragraph. It draws on a clock, never a scroll timeline, for the same
   reason the bridge's line does: a half-drawn tick reads as a failure. At `full` the ring
   answers with one outward pulse and then stops; a success that keeps pulsing reads as a
   notification demanding something.
3. **The shake on a form-level refusal.** 4px and settles, against their 10px four times —
   this is a medical form, not a wrong password. Deliberately **not** on field errors: those
   sit under the field somebody is already looking at, while a form-level error appears at
   the bottom with nothing else changing, which is the one that gets missed.

**The safety property is the reveal rule stated backwards, and it is what to check after any
change here:** the finished state is what the markup renders, and the unfinished state exists
only inside the motion gate. Verified by driving a real submission at all three tiers and
under `prefers-reduced-motion`: the tick ends at `stroke-dashoffset: 0` every time, with
nothing left running. Nothing here can leave a success looking like a failure.

**A landing-page measurement includes prefetch.** The wire figure moved 283 KB → 292 KB
between two clean builds with no landing-page change, which is Next prefetching `/case/new`
and `/student` from the hero buttons — so making the case form bigger shows up on the landing
page's number. It is paid once and is why a second visit to `/case/new` measures 1 KB. Worth
knowing before hunting a regression that is not there.

### What ClinMatch and AsnanLink actually do better, and the one thing taken

Haider sent screen recordings of both and said their animation is better, ClinMatch
especially. Watched frame by frame rather than judged from a description — `ffmpeg` into
contact sheets, then a dense burst across one carousel advance.

**The finding that mattered is not what it looked like from a distance.** ClinMatch's step
carousel appears to slide; it does not. The card sits still and **the illustration inside it
animates** — a profile card whose fields fill in and gain a tick, a listing being picked out,
a calendar confirming a day. Their step cards carry a small picture of the step *happening*
rather than a symbol labelling it, and on a page explaining an unfamiliar process to somebody
who has never used one, that is most of the difference between the two pages.

**So that is what was taken.** `src/components/brand/step-scenes.tsx` — four scenes replacing
the four icon tiles in the steps rail. One rule governs all of them and it is the point:

- **Every scene is drawn complete in the markup; animation only ever adds motion on top.**
  No line starts empty, no tick starts undrawn, nothing starts at `opacity: 0`.

That is deliberately *not* how ClinMatch do it. Theirs assemble from nothing, which is
prettier and which this codebase cannot safely copy: a reveal that plays from empty has to be
triggered, and CSS offers only a clock (which fires while the card is still far below the
fold, so it is over before anybody looks) or a scroll timeline (which freezes where the reader
stopped — the bug that once left a third of this page blurred, and which here would leave a
half-drawn tick reading as a failure). Starting complete removes the entire class of problem:
there is no tier, browser or scroll position at which one of these is part-drawn. Verified by
sampling every animated element's opacity twelve times across the cycle at all three tiers —
**nothing ever drops below 0.35**, and `none` and `prefers-reduced-motion` run zero
animations.

This is the second deliberate exception to "nothing loops in the reader's peripheral vision",
after the bridge's mote, and the argument is the same: these sit inside cards somebody swipes
to and looks at, and each one's claim is that something *happens* at that step. Every cycle is
slow, small, and mostly pause.

**A scene has to be judged at its real size, not in the editor.** The queue scene was built
as white rows on a pale ground with a translucent band sweeping across them; at 96 pixels the
rows did not separate and the band read as a smear. It was rebuilt as solid bars with real
gaps and the taken case as the only coloured thing in the picture. Contrast between
neighbouring shapes is the whole job at this size.

Cost: **286 KB, first paint 2.7s** — unchanged, because four inline SVGs and a block of
keyframes are noise against the typeface.

**What was deliberately not taken:**

- **ClinMatch's auto-advancing carousel.** It is motion, and it is the wrong kind: it takes
  control from the reader, fights a slow phone, and is an accessibility problem. Our rail
  snaps and reports its position with a scroll-driven progress bar, which is the honest
  version of the same idea.
- **AsnanLink's hero.** A tilted device mockup with floating chips — "New Cairo", "Patient A
  Needs A Crown Fix", "It's A Match!" — staggering in on load. Well made, and it is a
  screenshot of an app سنون does not have. The bridge diagram already does that job without
  inventing a product.
- **AsnanLink's flip countdown to launch.** سنون has no launch date and must not invent one.

**And the one thing left on the list is now built: each audience has its own colour.**
ClinMatch run patients green and students amber throughout; Haider chose orange for students
and green for the people they treat. It answers "nothing talks to students" in a way copy
alone could not — a student who lands on `/student` is on a page that is visibly theirs.

Four things about it that are not obvious and should survive:

- **The scope is surfaces one audience owns, not decoration.** `/student/*` is orange
  throughout, each figure in the bridge wears their own, and a student call to action is
  orange wherever it appears — including the landing page's second button, which is the one
  place the orange appears on a green page and is exactly the point. The landing page itself
  stays green: it is the door both audiences come through, and a page in two brand colours
  reads as two products rather than as one with two sides.
- **It is one wrapper and one class, not an edit to twenty components.**
  `student/layout.tsx` wraps everything in `.student-area`, which re-points the accent tokens
  at the orange ramp. Every `text-accent`, every `tone="accent"` card and every primary button
  inside turns orange on its own, and no component learns that audiences have colours. That is
  what keeps `tokens.css` the only place a colour lives — the rule this whole file rests on.
- **A filled button and accent-coloured text are now two different tokens.** They were one,
  and light orange cannot do both jobs: white on a 75% orange is about 2:1, and an orange dark
  enough to carry white is brown — which is literally what the first attempt shipped, and not
  what was asked for. So `--color-accent-fill` is what a button is made of and
  `--color-accent` is what text is made of. On the teal they are the same value and the
  patient side is byte-identical; on the orange the fill is light with near-black ink on it,
  and the text is a darker orange that reads at label size. Any new filled surface uses
  `-fill`, or it will go brown the next time somebody re-themes.
- **The warning colour moved from amber to a light red**, on Haider's instruction, because
  amber at 75° sat right beside the students' orange and a warning ribbon has to be
  unmistakably not a brand colour. Danger went deeper at the same time so the two reds
  separate. Two reds is only affordable because every ribbon carries its Arabic label as well
  as its colour — that rule is what pays for this, and is not one to relax later on the
  strength of having got away with it here.

**The steps were cards before they were a rail.** Four sentences each with a 16px icon read, in Haider's words, as
icons put there to fill a gap rather than to mean anything — which was fair. Each step is a
card with a real icon in a tile at the size of the number beside it. The casualty is the long
drawn line that used to run behind them: an opaque card sits on top of it, so it became
invisible the moment they became cards. What replaces it is a short connector in each gap,
aligned to the icon tiles, arriving with its own card.

**The bridge diagram — built.** `src/components/brand/match-bridge.tsx`. Haider's idea and
the right one: a student in a lab coat on one side, a patient on the other, a line joining
them with the name sitting on it. It is the one picture that explains سَنّون without a
sentence, and it replaced `MatchMotif` in the hero rather than joining it — the abstract and
the literal must not share a hero, so the motif moved to the closing band, where being
decoration is the whole job. Rules it inherits and which any change must keep:

- **No faces.** The heads are plain circles. A figure with eyes would also make it a picture
  of two particular people rather than of two roles.
- **Inline SVG**, like `MatchMotif` and the icon set, and **colour from tokens** rather than
  literals so `tokens.css` still re-themes everything.
- **The two figures are different colours on purpose** — accent and warm. They are not the
  same person, and what each has that the other needs is the entire product.
- **It sits on light surfaces only.** The accent-coloured student would disappear on the
  accent band; moving it there needs a variant, not a copy.
- **The line animates on a clock, not on a scroll timeline**, at every tier that animates.
  A `view()` timeline freezes where the reader stopped, and a half-drawn line between two
  people reads as a broken connection rather than a made one. It is also the one place other
  than the motif arcs where `stroke-dashoffset` is allowed against the transform-and-opacity
  rule: there is no transform that draws a line.

The line is deliberately plain. What belongs on it is open, and the badge holds the place
with the wordmark until there is a logo.

**Nothing on it overstates.** No testimonials, no user counts, no waiting time,
and — deliberately — no claim that the treatment itself is free, only that سنون
takes nothing. Whether the university charges for materials is not ours to state
and is not known; see the open question below.

A cinematic 3D clinic scene is described in the product vision. **It is not in the MVP.**
It is the single most expensive, slowest, most performance-risky part of the plan, and it
sits in front of a product whose value is matching patients to students. Build a fast,
warm, Arabic-first landing page with three clear entry points — patient, student, supplies —
and revisit the cinematic entrance in v2 once matching works.

If asked to build it anyway, raise the performance cost on low-end Android first.

---

## عالجني, and why سنون will not diagnose from a photograph

A third competitor, and the first Iraqi one: **عالجني**. Haider's description, since it has
no web presence to check — searched, and it is Instagram/Telegram-only, which is normal here.
Two facts from him:

- **Students buy patients on it.** It has launched and it is paid.
- **It claims AI-assisted diagnosis from photographs alone.**

**The first is the competitive answer and it is not close.** Selling patients to students is
precisely what this file already forbids, in three separate places written before anybody
knew عالجني existed: no bidding or pricing or competitive mechanism between students; the
interface must not feel like students are shopping for patients; and سنون takes nothing from
either side. A platform where a student pays for a case has changed what the case *is* — the
patient becomes inventory. سنون does not need to react to this. It needs to keep saying
plainly what it does, which is what the landing page's privacy section already does and
neither competitor can copy.

**The second was asked as a real question — is it possible, and is it free?** Three answers,
and the third is the one that settles it:

- **Possible, yes, and worse than it sounds.** Vision models will return a confident
  paragraph about any intraoral photograph. The confidence is not accuracy: interproximal
  caries is invisible without a bitewing, so is anything periapical, and a phone photo adds
  bad light, bad angle and no dry field. A model that misses the lesion between two teeth
  still writes fluently about the one it can see. Haider said this before asking, and he is
  right.
- **Free, no.** Every image is a paid API call. Free tiers exist and are small, and the cost
  scales with exactly the thing سنون wants more of.
- **And it would make سنون a care provider.** This is the one that decides it. The first line
  of this file is that سنون matches people and does not deliver care — that sentence is what
  keeps it out of medical liability, and it survives only while nothing here tells a patient
  what is wrong with them. A diagnosis screen ends that, with no examining dentist behind it.
  There is a privacy cost too: it would mean shipping intraoral photographs to a third party,
  against a codebase that strips their GPS, serves them from behind an authorisation check
  and deletes them after sixty days.

**So سنون does the thing that actually helps and carries none of that: guided questions.**

**The case form asks what it can help with, not what hurts.** It opened with
`شنو يوجعك؟` and Haider corrected it: pain is not the common case. Most people arrive
because a tooth has stopped working — a missing one, a broken filling, a denture they cannot
eat with — and a form that opens by asking where it hurts has already told those people it is
not for them. `بشنو نكدر نساعدك؟` covers everyone who arrives, and it is also the sentence a
receptionist actually says.

### The guided questions — `/case/guide`

AsnanLink's idea, and Haider's ask. A patient who knows they want a filling ticks the box; a
patient whose tooth simply hurts does not, and the form's own hint — "إذا مو متأكد، اختر
الأقرب لحالتك" — was سنون admitting it had nothing better. Now it asks a few plain questions
instead, each narrowing to the next, and ends either in a set of treatments to tick or in
"this is not something a student clinic should handle".

**Three layers, and the order is the whole point.** Haider's correction after walking
AsnanLink's own flow, and it is structural rather than cosmetic:

1. **The emergency screen, for everybody, before anything else.** Six yes/no items on one
   page. Any tick at all ends in a hospital referral.
2. **Age.** "عمر المراجع أقل من ١٥ سنة؟" — under fifteen is a paediatric case.
3. **What they need** — the tree that already existed.

The reason layer 1 moved to the front is the bug it fixes. This tree used to carry its red
flags as *answers inside branches*: swelling was an option under "pain", trauma under "broken
tooth". So they were only ever found by somebody who happened to pick the right branch first
— a person with a spreading facial infection who tapped "عندي سن مفقود" never saw the
question at all. Asking up front catches everyone and costs one screen.

The six items are AsnanLink's own, which is better provenance than anything invented here.
They are still clinical content and still need Haider's sign-off.

**The screen is one page, not six.** AsnanLink ask six separate Yes/No rows with one submit,
and that is right: six sequential screens would be six round trips before a patient reaches
the first real question. It is a plain **GET form**, so it still needs no JavaScript — the
browser builds the query string and navigates, exactly as the answer links do. Verified by
ticking a box and submitting with `javaScriptEnabled: false`.

**Every checkbox carries the same name and the same value, and the server only counts them.**
Which symptoms somebody ticked is health information about them; a distinct value per box
would put a list of a stranger's symptoms into their browser history and into the `Referer`
header on the way out. `screenOutcome` reads whether there were any, never which.

**A child says what they need too, and which tooth.** Haider's follow-up. Under fifteen is
no longer a dead end: it asks whether the tooth is a milk tooth, a permanent one, or unknown,
then what the child needs — including **fluoride**, added as a treatment type on his
instruction and seeded to the fifth year because that is where paedodontics sits. "ما متأكد"
is offered plainly, because a parent guessing to get past a form is worse than one saying so.

**Every child outcome carries `paediatric` as well as the need, and that forced an
architectural exception.** `listOpenCasesForStudent` matched on array *overlap*, so a child
needing a filling would overlap on `filling` and appear to every fourth year in the city —
who must not treat children at all. So **a case carrying `paediatric` is visible only to a
stage that can perform `paediatric`**: containment for that one slug, overlap for everything
else. The overlap rule exists so a patient is not left waiting for a student who can do
everything; that reasoning does not hold for a child, whose whole case belongs to one
department. Recorded here rather than changed quietly, because "visibility is overlap, not
containment" is written down two sections above.

**Still open, and it hangs on one clinical fact Haider is checking:** can a fourth year treat
a *permanent* tooth in a patient under fifteen? If they can, the milk/permanent answer is
load-bearing — it decides whether the case may be offered to fourth years at all, and needs a
field on the case to carry it. **If they cannot, the question has no job and comes out.** It
is asked and discarded today; all three routes reach the same outcomes. Nothing should be
built on it until that answer arrives.

**Under fifteen is a flat line, deliberately.** Haider raised the real nuance himself — a
thirteen-year-old wanting a composite on a permanent tooth does not *have* to go to
paediatrics and could be seen in operative — and then ruled on it: *"this is a bit tricky and
misleading, keep it as fifteen"*. A patient standing in front of a form cannot be asked to
judge which department suits their child's tooth. Under fifteen ticks `paediatric` and
nothing else, so the case routes to the students who do that work; **if children should also
pick what they need, that is one change and his call.**

**"دلّني على أقرب مستشفى" is taken from AsnanLink and is the one genuinely practical thing on
their emergency screen.** Telling somebody to go to a hospital is advice; handing them the
map is help. It is a maps **search**, not a pin: `/maps/search/?api=1&query=مستشفى طوارئ`
runs against the device's own location, so it lists the emergency departments actually near
whoever tapped it — and سنون never learns where they are. A `@lat,lng` URL would need a
location this flow does not collect, and a plain `/maps` link opens the map showing nothing
in particular, which is the version that is no help at all.

**And there is a way past a referral now — reversing an earlier decision, on Haider's
instruction.** سنون deliberately had none, and the reason still stands: a route to the queue
sitting under "go to a hospital now" reads as permission to wait. His counter is stronger:
somebody who has already been to hospital, or who mis-tapped, or whose tooth came out last
week rather than today, was left on a dead end with nothing but "start over". Both readings
are right, so the resolution is in the *hierarchy*, not in the choice — it is a quiet link
below a divider, never a second button competing with the hospital, and it is worded as a
claim the person makes about themselves ("شفت طبيب أصلاً، أو أشّرت غلط؟") rather than as a
dismissal of the warning.

**The emergency card's text is written general.** It used to sit at the end of one branch and
describe swelling, because swelling was the only way to reach it. Six different things send
somebody there now, and a card talking about swelling to a person holding their own knocked-out
tooth reads as a page that has not understood them.

`src/lib/triage/`. Five rules, none of them cosmetic:

1. **It never diagnoses, and the copy must never read as one.** Every leaf says what the
   description *resembles* and that the student will decide — `يشبه`, `الطالب راح يشخّص` —
   never `عندك`. A test greps for the diagnosing form, because this is the rule that would
   erode one well-meaning copy edit at a time.
2. **A result is a set of treatment slugs and nothing else.** The same slugs the form's
   checkboxes carry and Payload seeds, so the whole output is "which boxes to tick". No new
   field, no text landing on the case.
3. **The path is never stored, and never even goes in the URL.** Which answers somebody
   picked is health information about them; the treatments they end up requesting are what
   سنون already needs. Only the current node id is in the query string — a full path would
   follow them into their history, into the `Referer` header on the way out, and into any
   screenshot they send. "رجوع" is computed from the tree instead.
4. **A student may not root-fill a molar**, and the tree has to know it. Haider's
   correction, and the proof that the draft content had real errors in it: molars carry
   several roots and several canals, and a university clinic does not let a fourth or fifth
   year attempt them. So "pain that sounds like a root canal" now asks *which tooth* before
   it concludes anything — anterior and premolar go through as student cases, a back molar
   is sent to a dentist, and "I am not sure" becomes an examination. A premolar with two
   roots is the genuine grey case and the patient is deliberately **not** told so: "it might
   work and it might not" helps nobody standing in front of a form, and the student decides
   at the chair.
   This also added a third kind of exit. A referral now carries `now`, `soon` or **`scope`** —
   and `scope` is styled in plain grey rather than in the danger colour, because "students
   may not do this one" is information, and dressing it like a spreading infection tells
   somebody with an aching molar they are in danger when they are not.
5. **Some answers must not end in a treatment at all.** A swollen face with a fever, a tooth
   knocked out in an accident, an ulcer that has lasted weeks — those belong in a hospital
   today, not in a queue for an appointment that may be a week away. A triage tree with no
   exits is worse than no tree, because it routes everything into the one place it knows.
   The referral screens offer **no route to the case form**; a "قدّم حالتك" button under
   "go to a hospital now" would read as permission to wait. (The site footer still carries
   its ordinary nav link, below the disclaimer — stripping a site's footer on one page reads
   as broken rather than careful.)

**Only the card moves between questions, not the screen.** Haider's note, and it is the one
piece of motion this flow needed. Every answer is still a real navigation — that is what
keeps the whole thing working with no JavaScript — so the *outgoing* card is gone before
anything could animate it. What can be animated is the arrival: the new card enters from the
end edge as though the old one had slid off the other way, and on a real navigation the eye
supplies the rest. The page-level `.page-enter` fade stands down for this route via
`:has(.guide-flow)`, so the two do not run at once and read as the page arriving twice; a
browser without `:has()` gets both, which is a softer arrival rather than a broken one.

**The step rail is three fixed layers, not a bar filled by depth.** The paths are not the same
length — somebody two questions from the end and somebody four would see the same fraction —
so a proportional bar would promise a distance no route guarantees. The three layers are the
real structure and they are the same for everybody. An outcome belongs to no layer, so every
step reads as done. The rail deliberately does *not* travel with the card: it is the one thing
on screen that should feel fixed while the questions move past it.

**Every answer is a real `<a href>`, and that is the whole design.** A tree needs state and
the obvious way to hold it is a Client Component — which leaves a patient on a slow
connection staring at a dead question until the JavaScript arrives, on the one page that
exists for people who are already unsure. The current node lives in the query string instead,
so every answer is an ordinary link: it works before hydration, with JavaScript disabled, and
on a browser that never runs it. `<Link>` still prefetches, so after the first tap the rest
are instant. **Verified with `javaScriptEnabled: false`** — the whole tree walks, the handoff
pre-ticks the form, and a junk node id lands on the first question rather than a blank page.
Slow 3G: **285 KB, first paint 2.6s**, the same as every other page.

**The handoff only ever pre-ticks.** `/case/new?t=root-canal` arrives with that box checked
and everything else exactly as editable as before — the case form gains no step, which is the
one thing this file says it must never do. A rejected submission's own values always win over
the guide's suggestion, or an edit somebody made after disagreeing with it would be silently
undone. Unknown slugs are filtered against the real treatment list, so a renamed treatment
means fewer boxes ticked and never a broken form.

`tests/triage.test.ts` holds the structure: unique ids, no answer pointing at a node that
does not exist, nothing unreachable, no cycle on any path, every result naming a treatment
**read out of `seed.ts` itself** rather than a copied list, no referral carrying treatments,
and at least one referral surviving. The seed cross-check is the one that matters most — a
copied list passes forever after somebody renames a slug, and the symptom is a patient
landing on a form with nothing ticked and no idea why.

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

**Built.** `src/lib/notifications/` is the interface — a case status change calls
`sendNotification()` and knows nothing about channels. Telegram registers itself as a
channel only when a bot is configured, so an unconfigured deployment reports `NO_CHANNEL`
rather than failing.

Rules the implementation holds to:

- **Sending is never a precondition.** A claim that succeeded is not undone because a
  message failed, and notification happens after the state change, never inside its
  transaction.
- **Invite tokens are stored hashed**, like tracking tokens, and keyed with a distinct
  label so one can never be replayed as the other. The link is a credential: whoever holds
  it receives that patient's notifications.
- **Single use.** An invite already bound to one chat is refused for another, so a
  forwarded link cannot move a patient's notifications to a stranger.
- **The webhook is a public URL.** The only thing separating a real update from a forged
  one is `X-Telegram-Bot-Api-Secret-Token`; without it anyone could post a synthetic
  `/start <token>`.
- A patient's invite is minted from their **tracking token**, never from a case id in a
  form — an id would let anyone request notifications for a case they do not hold.

Setup needs three environment variables (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
`TELEGRAM_WEBHOOK_SECRET`) from a bot created with @BotFather, and the webhook pointed at
`/api/telegram/webhook`.

**Locally there is no public URL for a webhook**, so `pnpm telegram:poll` long-polls
`getUpdates` instead and feeds them through the same `handleTelegramUpdate` the route uses —
only the delivery differs. Never run it while a webhook is registered: Telegram refuses
`getUpdates` in that case, which is a useful safeguard against two consumers racing for the
same updates.

---

## Future: the supplies store

A dental products marketplace is planned for later — oral hygiene products for patients,
instruments and materials for students and dentists. The intended model is commission-based:
supplier lists, customer orders, supplier fulfils, سنون takes a cut. **No owned inventory.**

**It is no longer advertised on the site.** The "متجر سنون — قريباً" band is removed on
Haider's instruction, and the reasoning is worth keeping: a "coming soon" panel is a promise
the site cannot keep, and it was the only thing on the page pointing at something that does
not exist. Its place in the navigation model is still held in `copy.ts` (`landing.supplies`)
so nothing has to be retrofitted. When the store is built it gets its own site, and this one
is updated to match it and link across as advertising — Haider's plan, not a default.

Haider also raised, as an idea only: a **نظام سنون للعيادات**, a clinic-records system that
would hold a clinic's own data. Recorded so it is not lost. **Do not design for it** — it is
not a decision, and the one thing it must not do yet is shape the case or auth model.

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

## The outstanding work

`docs/roadmap.md` holds it, in order, with the deployment blockers first — Haider asked for
the remaining work written down and committed one item at a time rather than in one
unreviewable change. **The two real blockers on deploying to Vercel are a hosted Postgres and
somewhere to put uploaded files**; the rest is accounts he has to create. Uploads are the one
that would fail silently: `staticDir` writes to a local disk that Vercel destroys minutes
later, so photographs and enrolment documents would appear to save and then vanish.

---

## Open decisions — ask, do not assume

These are genuinely unresolved. If a task depends on one, stop and ask rather than picking.

1. **Fair distribution.** Should a student who has already received several cases through
   سنون be deprioritised? Tracking is worth building; the policy is not decided.
2. **External cases.** Students also find patients outside سنون. Self-reported external
   counts should be visibly marked as unverified and should not gate eligibility — but
   whether to collect them at all is open.
3. ~~**Case visibility scope.**~~ **Decided and revised — see "Cases that need two stages".**
   A student sees any case that *overlaps* what their stage may treat, not only cases wholly
   within it. The consequence to watch is unchanged: a wrong capability mapping makes cases
   invisible rather than merely inconvenient, so it is admin-editable and worth auditing
   against cases that sit unclaimed.
4. ~~**Patient confirmation mechanism.**~~ **Built.** The student reports having called,
   which is recorded but moves nothing; the patient is then asked, and only their answer
   advances `MATCHED → CONTACTED`. Asked two ways, because Telegram is optional: inline
   buttons in the bot, and the same question on the tracking link. `reportNoContactByPatient`
   records a "nobody called" without releasing the claim — the contact window is already
   running, and a mistaken tap must not take a case from a student mid-call.
   ~~**Still open:** what happens when the patient never answers at all.~~ **Decided —
   both options, because they answer different halves.** Reporting contact now *extends* the
   window by a configurable grace (default 48h), since a patient who uses neither Telegram
   nor their tracking link is ordinary on a cheap phone rather than a failure. When even the
   grace runs out, the expiry job leaves the claim alone — it only ever releases claims where
   `contact_asserted_at IS NULL`, the case it was written for — and the claim surfaces to an
   admin at `/admin/cases`, who rings the patient and either confirms contact or returns the
   case to the queue. Neither is automatic: advancing on the student's word is what the
   confirmation rule exists to prevent, and releasing punishes the one person who did what
   was asked. An admin who has rung the patient is a check; a timer is not. This does not
   scale to thousands of cases and does not need to — at one or two cities it is a handful a
   week, and a wrong automatic answer costs someone their treatment or their case.
5. **Photo requirement.** Optional at submission — but should some treatments require them?
5c. **The guided questions' clinical content is a DRAFT and must not launch unreviewed.** The
   machinery in `src/lib/triage/` is finished and tested; the questions, the answers and above
   all the three `referral` exits were written by Claude, which is not a dentist. Haider is.
   Nothing in that tree should reach a real patient until he has been through it line by line.
   The referrals are the ones that matter — a missing exit sends somebody who needs a hospital
   into a queue instead, and that is the failure mode this feature introduces. Also open, and
   his call: whether the tree eventually moves into Payload so he can edit wording without a
   deployment. It is a migration rather than a redesign, since the ids and slugs are already
   the join keys, but the shape should settle first.
5b. ~~**Does the university clinic charge for materials?**~~ **Answered by Haider.** Some
   universities charge a **symbolic fee** for services their own students provide, usually no
   more than **5,000 د.ع**, and the **student** states the exact price — and the cost of
   better materials where a choice exists — before treatment starts. `fees.long` in `copy.ts`
   says exactly that, in one shared string used in three places: the landing hero, the FAQ,
   and above the case form. Three wordings would drift and the one that drifts is the one
   somebody reads.
   Two consequences already applied: the promise card no longer says **مجاناً** (a reader
   takes that as "the treatment is free", which is the claim this answer forbids) and the
   closing band no longer says "ما تحتاج حساب ولا فلوس". What is still not known is *which*
   universities charge and how much; when that is known it belongs in Payload beside the
   college, not in `copy.ts`.
6. **University choice by the patient.** Raised and deliberately deferred, not rejected: after
   picking a city, should the patient narrow their case to particular universities they can
   actually reach? Transport across a city is the real obstacle in Iraq, so the information
   has value — but any filter here shrinks the pool of students who can see a case, so the
   leaning is optional-and-multi-select with "any" as the default, never required. Blocked on
   real data: which universities have dental colleges, and in which cities. Do not invent that
   list. `docs/dental-colleges-draft.md` holds web research to be corrected, not a decision —
   fourteen cities with a college were found. **One half of that is now answered:** Haider
   says almost every dental college in Iraq runs a teaching clinic that takes outside
   patients, which stands to reason — it is how their own students meet the case requirement
   سنون exists to help with. So a teaching clinic is not a filter and the question is the
   plainer one of which colleges exist and where.
7. **Which cities to launch in.** The current 18-city list in `src/lib/config/index.ts` is a
   placeholder written by Claude, not a decision. Realistically the launch is one or two
   cities.
8. ~~**Retention periods**~~ **Decided, and all three are Payload settings.** Photographs go
   60 days after a case reaches a terminal state; contact details — name, phone **and the
   patient's own notes** — go at 90 days; the case row itself is kept indefinitely.
   `scrubExpiredContactDetails` erases rather than deletes, and marks `contact_scrubbed_at`,
   for two reasons: an admin has to be able to answer "what happened to SN-4KP7QW" when
   someone rings months later, and for a case that went wrong the event log is the only
   record there is. A case that had a patient must also stay distinguishable from one whose
   details were never filled in. Scrubbing takes the keys with it — the tracking token is
   revoked, and any Telegram binding for the case, since neither can lead anywhere useful and
   both are live credentials — **and the optional patient-account link**, which otherwise
   keeps the case attached to a named, addressable person long after the details on it were
   erased. Revisit the 90 days if it turns out patients ring later than that.

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
