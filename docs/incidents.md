# What has actually broken, and the rule each failure left behind

Every entry here is a real failure in سنون, most of them found by Haider using the product
rather than by a test. They are kept in full because **the rule alone is not persuasive** —
"make the cap a real check" sounds like pedantry until you have read how a student lost their
entire queue, and somebody will otherwise undo it as tidying.

`CLAUDE.md` carries the rules. This file carries the reasons, and the shape of the mistakes,
so the next one is recognised earlier.

**The pattern across most of them:** the failure did not look like a failure. A blank page
with a 200 response, a date that is merely wrong, an empty queue, a build that goes green.
Anything that *looks like missing data* is the expensive kind, because nobody reports it as
a bug — they conclude the product is empty and leave.

---

## 1. The completely blank admin, in production only

**Symptom.** `/admin` rendered nothing. A 200 response, 51KB of correct HTML on the wire
with the login form inside it, and a white screen. Nothing in any log. Locally it was fine.

**Cause.** `storagePlugins()` returned `[]` when R2 was unconfigured. Payload resolves admin
components through `src/app/(payload)/admin/importMap.js`, a file **generated at development
time and committed**. Development had no R2, so the S3 plugin never loaded, so the generated
map had no entry for its `S3ClientUploadHandler`. Production had the four `R2_*` variables,
loaded the plugin, asked the map for a component that was not in it, and React threw during
hydration — emptying the page it had just been handed.

**Why `curl` said everything was fine.** Server-side rendering is unaffected. The HTML is
correct. Only a real browser, which hydrates, shows the failure.

**The rule.** *A committed, generated artefact whose contents depend on environment variables
is correct on one machine and wrong on another.* The fix is not a regenerated map — it is
that the plugin is now **always installed** and `enabled: config !== null` is what varies, so
every machine generates the same file. `tests/admin-import-map.test.ts` asserts the declared
component set is identical with and without R2; that half fails on the old code.

**And: verify the admin in a browser, never with `curl`.** Reproduced and fixed by driving a
real Chromium at a production build: 0 visible characters before, the Arabic login form after.

---

## 2. `column "prefix" does not exist` — the same fault, in the database

**Symptom.** Every upload failed in production. No student could send an enrolment document,
no patient's photographs could be stored, and `/admin/collections/case-photos` showed
`Error: Failed`. `pnpm payload:migrate` reported nothing to do and the build went green.

**Cause.** The storage plugin keeps each file's prefix on the row, so it adds a `prefix`
column to both upload collections — and by default it adds that column **only while the
plugin is enabled**, which is only where R2 is configured. Migrations are generated on a
development machine, which has none, so no migration ever wrote it.

**Why it is worse than the blank admin.** It fails *late*. The case is already written by the
time the photograph is refused — which is how it combined with incident 4 below to produce a
queue of duplicates.

**The rule.** The same one as incident 1, now stated wider: **the database schema is a
generated artefact too.** `alwaysInsertFields: true` is the fix — Payload provides it for
exactly this and makes it the default in v4 — and `tests/upload-schema.test.ts` holds the
property: the upload collections declare the same fields with and without R2.

**And a method worth repeating.** `payload migrate:create` needs a TTY, so the migration was
written by hand — but not guessed. Payload's own `push` was run against a scratch database at
that revision, the resulting DDL was read off it, and the hand-written migration's output was
diffed against the pushed schema until the two were identical. Do that every time a Payload
migration has to be written by hand.

---

## 3. Every date in the product was a day out

**Symptom.** Haider submitted several cases at 01:45 and could not find them in
`/admin/cases`. They were at the top of the list, stamped with yesterday.

**Cause.** Only `formatAppointment` pinned the timezone. `formatCaseDate` and
`formatCaseDateTime` used the server's, which on Vercel is UTC. So for the three hours between
21:00 Baghdad and midnight, **every date in سنون was wrong** — the admin list, the student
queue, the patient's tracking page and the contact deadline alike.

**Why it survived a security review and 645 tests.** A wrong date does not look like a bug.
It looks like missing data, and the tests ran in a timezone where the bug was invisible.

**The rule.** `BAGHDAD_ZONE` is the only place the zone is named, and every formatter takes
it. `tests/dates.test.ts` pins `TZ=UTC` and asserts the Baghdad day — **the test environment
has to be the broken one**, or the test proves nothing.

---

## 4. A queue of duplicate cases carrying no photographs

**Symptom.** Haider's admin filled with near-identical cases, none with photographs.

**Cause.** `submitCaseAction` wrapped the case write, the photographs and the student alert
in one `try`. Object storage refused a photograph (incident 2), and the patient was shown
"submission failed" — on a case that had **already been written**. Reading the screen
correctly, they submitted again. Every attempt left a case behind and reported a failure.

**The rule.** *The case write is its own `try`, and nothing after it may become a failure the
patient sees.* Photographs and the alert are best effort, each logged under its own name —
"Case photographs failed to store" is the line that names a broken storage credential, and
logging it as a submission failure sends whoever reads it after the wrong thing entirely.

`tests/case-submission.db.test.ts` makes Payload's `create` throw for `case-photos` **only**;
a blanket stub would fail the submission for the wrong reason and pass against code still
broken, because validation reads the city list through the same client.

---

## 5. The queue that disappeared when a student claimed one case

**Symptom.** On the first real day, a student claimed one فحص case and every other case
vanished for them.

**Cause.** One conditional on the student page: `activeClaim ? <the held case> : <the queue>`.
Holding a case replaced the entire screen.

**Two faults, and the second is the one that mattered.**

1. It made سنون look empty. A student cannot tell "there are no patients" from "I am not
   allowed to take another", and the first reading is the one they leave on.
2. **It was not a rule.** A rendering decision stops nobody: the bot's claim button reaches
   `claimCaseForStudent` through attacker-controlled `callback_data` with no page in front of
   it, and every server action is a public POST. A student at the "limit" could hold as many
   cases as they could name ids for.

**The rule.** The cap lives in `claimCaseForStudent` beside the city, stage and day checks,
and the number is a Payload setting. **The queue is always drawn in full** — at the cap the
claim button is disabled with a sentence naming what clears it. Never hide a list to express
a rule.

---

## 6. Sign-up that silently produced accounts nobody could use

**Symptom.** None, which is the point. Sign-up appeared to succeed.

**Cause.** `src/lib/email.ts` throws in production when email is unconfigured — but Better
Auth sends its verification email as a **background task**, so the throw never reached the
caller. The account row was written, no message went out, and the student was left holding an
account they could never verify or log into.

**The rule.** *Throwing is not sufficient when the thing that throws is a background task.*
Any flow depending on a message arriving must check `isEmailConfigured()` **before writing
anything**. `tests/email-guard.test.ts` holds that line.

---

## 7. A treatment that would have been invisible to everyone

**Symptom.** None yet — found by querying the database rather than trusting "Seed complete".

**Cause.** `ensureStageDefaults` returned early whenever a stage already had any defaults, so
re-seeding could not overwrite an administrator's decision. The intention was right; the
effect was that adding a treatment to `seed.ts` did **nothing** to a database that already
had the stage. `fluoride` was created as a treatment type, stage 5 never gained it, and every
case asking for it would have been invisible to every student.

**The rule.** Seeding is **additive**: it adds what is missing and removes nothing. An
administrator's *additions* survive; a deliberate *removal* of a default comes back on the
next seed, which is the right way round.

**The wider rule.** An empty queue reads as "no patients", never as "a missing row". Any
mapping that can make cases invisible is worth auditing against cases that sit unclaimed.

---

## 8. The empty college list that blocked the first sign-up

**Symptom.** Haider added a university, and the student profile form still refused to render,
saying "universities and colleges are not added yet".

**Cause.** Two faults at once. The message named both lists whichever one was missing, so it
pointed at the thing he had just fixed. And the missing one — colleges — **turned out not to
be a real thing**: every Iraqi university has exactly one dental college, so the field was
asking a question with no answer.

**The rules.** *"Not ready" is never a sufficient message to somebody who can fix it* — name
the specific list. And a field that carries no information the neighbouring field does not is
not merely redundant; it is a step somebody gets stuck on.

---

## 9. A photograph killed the whole submission

**Symptom.** A 7MB phone photo died with an English "a server error occurred" and took the
filled-in form with it.

**Cause.** A server action's request body is capped at 1MB by default, and the case form posts
photographs through one. The request was refused *before the action ran*, so the server never
got to answer politely.

**The rules.** `serverActions.bodySizeLimit` fits the documented limits, **and the browser
applies the same limits before uploading** — a cap the server cannot enforce politely has to
be enforced early. Limits live in `src/lib/images/limits.ts` precisely so a Client Component
can import them without pulling sharp into the bundle.

---

## 10. A third of the screen permanently blurred

**Symptom.** At the `full` motion tier, cards sat half-revealed and never finished.

**Cause.** A `view()` timeline is tied to scroll position, not to a clock. **A scroll-driven
animation does not finish — it freezes where the reader stopped.** Cards were still inside a
long `animation-range` when somebody stopped scrolling, and stayed half-played indefinitely.

**The rules.** Every reveal range ends inside `entry`, so an element is fully resolved by the
time its top edge finishes entering the viewport; and **only properties that stay readable
half-applied may be animated** — opacity and a small lift qualify, `filter: blur()` does not.

**The method.** Stop at many scroll positions and assert nothing on screen is part-drawn. That
sweep is what caught it, and caught it a second time in its least obvious form: using the
`animation` shorthand inside `.stagger` silently reset `animation-range`, leaving a chip in
the middle of the screen frozen at six per cent opacity with nothing about the CSS looking
wrong.

**And:** a full-page Playwright screenshot does not drive a scroll timeline, so it photographs
every section below the fold as blank. That is the tool, not the page — judging this from one
tall image is how somebody "fixes" an animation that was fine.

---

## 11. Not ours, and the most instructive of all: Arabic digits

**عالجني rejects a phone number typed in Arabic-Indic numerals** and tells the patient their
Iraqi number is invalid. Haider hit it himself; it only worked once he retyped in Western
numerals.

It is the purest example of a bug that is **invisible to whoever built it** and blocks exactly
the user the product exists for — somebody on an Arabic keyboard. `normalisePhone` accepts
both Arabic-Indic (`٠١٢٣`) and Extended Arabic-Indic (`۰۱۲۳`), and this was verified by
submitting a whole case typed in Arabic numerals rather than by reading the parser.

**The rule that follows: never put a `pattern` on the phone input.** It would reintroduce the
bug in the browser, where the server's correct parser never gets a chance to run.

---

## The checklist this all adds up to

Before calling anything done:

- **Did I verify it the way a user meets it?** In a browser, on the real page, with real
  Arabic content — not with `curl`, not by reading the code, not from one screenshot.
- **Would this fail silently?** If the failure mode is a blank screen, an empty list or a
  wrong-but-plausible value, it needs a test that runs in the environment where it breaks.
- **Does anything generated and committed depend on the environment?** The import map and the
  database schema both did.
- **Is the rule I just wrote actually enforced, or merely rendered?** If a bot, a server
  action or a hand-made POST can reach past it, it is not a rule.
- **Does an empty screen say why it is empty?** To somebody who can fix it, by name.
