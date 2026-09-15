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
code, and where سنون ends up hosted is still open. `vercel.json` schedules it hourly if
deployed there.

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

**Where GSAP would genuinely earn its place**, if it is ever wanted: `Flip`, for the
shared-element page transition that React's `<ViewTransition>` cannot give us yet. That is a
real capability CSS has no answer for. The way to buy it without charging the median user is
the tier gate — `data-motion` is decided before first paint, so the script can be loaded
**only at `full`, and only after the page is interactive**. A weak phone downloads nothing.
That is the one proposal worth putting up, and it has not been built.

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
  and that needs verifying rather than assuming. It also cannot be judged in the
  single-file preview, which has no navigation at all.

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
