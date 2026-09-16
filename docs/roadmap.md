# What is left, in order

Haider's instruction: write the outstanding work down and commit to each item on its own,
rather than one large unreviewable change. This file is that list. It is not a wish list —
everything here is either blocking the deployment he asked for or something he has already
asked for by name.

**Read the blockers first.** Three of them need him, not code, and nothing below the line
can be tested until they are done.

---

## 0. Blocking the Vercel deployment — needs Haider, not code

These are the honest answer to "what's stopping you from deploying to Vercel". Two are real
engineering, three are accounts only he can create.

### 0.1 A hosted Postgres — **he must create it**

There is no database on Vercel. `DATABASE_URL` currently points at a local Postgres that
exists only inside this session. Options, cheapest first:

- **Neon** — free tier, one click from the Vercel dashboard, serverless-friendly.
- **Supabase** — free tier, also fine.
- **The existing EC2 box** (eu-north-1) — already paid for, but it must accept connections
  from Vercel's IP range, which means opening the security group.

Whichever it is, `pnpm db:migrate` and `pnpm payload:migrate` then have to run against it
once before anything works, and `pnpm payload:seed` after that.

### 0.2 Photograph and document storage — **built; four variables to paste**

`case-photos` and `student-documents` are Payload upload collections with
`staticDir: 'uploads/…'` — files on local disk, deliberately outside `/public`.

**Vercel's filesystem is ephemeral and read-only except `/tmp`.** Every uploaded photograph
and every student's enrolment document would be written to a container that is destroyed
minutes later. This would not error loudly; it would appear to work and then lose files,
which is the worst possible failure for a student's proof of enrolment.

**Done.** `src/payload/storage.ts` adds `@payloadcms/storage-s3` pointed at Cloudflare R2 —
S3-compatible, so there is no R2-specific package. What remains is his, and it is four
environment variables in Vercel: `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`. `.env.example` has the click path for creating the bucket and the
API token. **Until all four are set, uploads still go to the disk Vercel destroys** — the
code cannot tell him that, so it is the one item here to actually verify after deploying by
uploading a photograph and reloading the case the next day.

R2 rather than Vercel Blob, reversing the earlier leaning in this file: ten gigabytes free
against one, nothing charged for serving, and — the reason that decides it — a bucket that
is private by default. The authorisation rules had to survive this change.
`disablePayloadAccessControl` is left off, so files keep going through Payload rather than
through direct bucket URLs, and `/api/case-photos/[photoId]` keeps re-answering "who is
asking?" on every request; it reads the bytes through `readUpload`, which is now the only
thing in the codebase that knows where files live.

### 0.3 Secrets — **he must set them in Vercel**

`TRACKING_TOKEN_SECRET`, `BETTER_AUTH_SECRET`, `PAYLOAD_SECRET`, `CRON_SECRET`. I can
generate the values; only he can paste them into the Vercel dashboard. `BETTER_AUTH_URL`
must be the deployed URL exactly — it is what the Google redirect URI is built from.

### 0.4 Google OAuth — **he must create it**

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from Google Cloud, with
`<BETTER_AUTH_URL>/api/auth/callback/google` registered exactly, port included. Without
this, and without a verified email domain, **no student can register at all** — so the
student half of the site cannot be tested.

### 0.5 Things that will work but are weaker on Vercel — not blockers

- **The rate limiter is in memory.** On serverless each instance keeps its own counter, so
  the effective limit is looser than intended. It still caps a single abuser on a single
  instance. Worth moving to a shared store the day سنون matters; not worth blocking on.
- **`vercel.json` schedules `/api/cron` once a day**, because a Hobby account refuses
  anything more frequent — it rejects the deployment rather than running it less often. So a
  48-hour contact window expires between 48 and 72 hours. It needs `CRON_SECRET` set or it
  fails closed, which is the correct behaviour. An external scheduler (cron-job.org and
  friends are free) can hit the same URL hourly with the same secret if the wait ever starts
  costing a student their case.

---

## 1. Correctness and copy — small, and each its own commit

- [x] **Arabic-Indic digits in the phone field.** عالجني rejects `٠٧٨٠…` and demands Western
      digits. `normalisePhone` already converts both Arabic-Indic and Extended Arabic-Indic,
      and there is no `pattern` on the input to block them — verified by submitting a real
      case typed entirely in Arabic numerals. The three legal shapes are 11 digits from `07`,
      10 digits from `7`, and `+964`/`00964` then the 10.
- [x] **Root canals on molars.** A student may not root-fill a back molar. The guide now asks
      which tooth and sends molars to a dentist instead of into the queue.
- [x] **The landing page stopped addressing only patients.** The shared sections and the
      closing band are neutral, and the closing band offers both doors.
- [ ] **The FAQ still addresses only patients.** Label it as the patients' FAQ and add a
      students' one beside it — "شنو أحتاج حتى أسجل؟", "شلون أعرف الحالة تناسب مرحلتي؟",
      "شنو يصير إذا ما كدرت أكمل الحالة؟". This is the clearest remaining place a student
      finds nothing addressed to them.
- [x] **Step scenes instead of step icons**, taken from ClinMatch — the one thing in their
      two recordings that is genuinely better than what سنون had.
- [ ] **A colour per audience.** Both competitors run one colour for patients and another for
      students throughout. سنون already has accent and warm doing this inside the bridge
      diagram; extending it across the student pages would answer "nothing talks to students"
      more thoroughly than copy changes alone.
- [ ] **A real student surface.** Right now the student side is one block on the landing page
      and a login. It needs its own page explaining verification, what a case looks like, and
      what the stages may treat — the thing that actually recruits students.
- [x] **The triage tree became three layers** — emergency screen, age, then needs — after
      Haider walked AsnanLink's flow. The red flags used to be answers inside branches, so
      only somebody who picked the right branch ever saw them.
- [x] **Children pick what they need, and which tooth.** Milk / permanent / not sure, then
      six needs including fluoride. Every outcome carries `paediatric` plus the need.
- [ ] **Blocked on a clinical fact Haider is checking: may a fourth year treat a permanent
      tooth in a patient under fifteen?** If yes, the milk/permanent answer decides whether
      the case can be offered to fourth years, and needs a field on the case. If no, the
      question has no job and should be removed. It is asked and discarded today.
- [ ] **The rest of the triage tree needs Haider's clinical review**, referrals first. The
      molar correction is the proof that the draft content has real errors in it.

## 2. Design — the pass he asked for, page by page

Each of these is its own commit. The landing page has had three passes; nothing else has had
one, which is why the product still reads as a form once you leave the front door.

- [ ] `/case/new` — the longest form in سنون and the one that decides whether somebody gives up.
- [ ] `/case/track/[token]` — the page a patient returns to, repeatedly.
- [ ] `/student` and the student dashboard — a tool, per CLAUDE.md: density and speed, not novelty.
- [ ] `/student/profile`, `/student/profile/document` — where students drop off.
- [ ] `/case/find`, `/case/mine`, `/case/guide` — short pages, quick wins.
- [ ] The Payload admin views (`/admin/students`, `/admin/cases`) — last, and deliberately plain.

## 3. Still open, and waiting on him

- Which cities to launch in. The 18-city list is a placeholder.
- Which universities have dental colleges, and where. `docs/dental-colleges-draft.md` is
  research, not a decision.
- The logo. Deferred; he wants human help.
- A domain — on the critical path for password sign-up, because Resend only delivers to
  arbitrary addresses once a sending domain is verified.
