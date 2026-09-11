# What ClinMatch and AsnanLink do, and what سنون should take from it

Researched 10 September 2026. Both sites block automated fetching, so this is
built from their own public descriptions rather than from using the products.
Treat the feature claims as their marketing, not as verified behaviour.

## ClinMatch (clinmatch.io) — United States

Same problem, **opposite direction**. In سنون a patient posts a case and students
claim it. In ClinMatch a *student* posts a listing — "I need a full prophy,
X-rays, periodontal charting" — and patients browse the listings and submit
their contact details.

That inversion carries the whole product with it:

- Students get **leads**; programs track "views, patient leads, listing status,
  and conversion signals". The vocabulary is a sales funnel.
- The **college is a customer**, not just a place. A program gets a workspace: a
  student roster, verification oversight, and the ability to draft listings on a
  student's behalf.
- **Cost is stated on each listing**, before anyone spends time on a
  conversation.
- It is US dental-hygiene shaped — prophy, perio charting, hygiene programs.

## AsnanLink (asnanlink.app) — Cairo, Egypt

**This one is a near-twin of سنون, in Arabic, and it launched a fortnight ago.**
General matching opened 25 August 2026.

Same direction as سنون: the patient describes the problem in ordinary words, the
platform turns it into a structured case and matches it to a student. Same three
matching axes — they call them "skill level, availability, and location", which
is stage capability, days and city.

What they have that سنون does not:

- **Students set their own availability** — days, time slots, frequency — and
  matching uses it.
- **Appointments are confirmed in the platform** by the patient.
- **Cases are "reviewed"** before they reach students.
- **Treatment summaries and procedure tracking** for the student's portfolio.
- **Patient feedback and follow-up** after treatment.
- They say plainly: free to register, "you only pay for treatment when your case
  is matched" — so they answer the cost question up front.

They do not appear to have anything سنون has around **not needing an account to
be a patient**, which is سنون's sharpest advantage and worth keeping.

## What is actually worth taking

Ranked by what it would do for a real patient or student here, not by how novel
it is.

### 1. Match on days. This is a bug, not a feature gap.

سنون collects the patient's available days, stores them, shows them — and
**never matches on them**. `listOpenCasesForStudent` filters on city and
treatment overlap only, and a student has no availability recorded at all.

So a student who is in clinic on Sunday can be shown a case from a patient who
can only come on Tuesday. They claim it, they ring, and neither of them can do
anything about it. That costs the student a claim, the patient a call, and the
case a trip back through the queue.

Both AsnanLink and the ordinary logic of a clinic timetable say the same thing:
the student's clinic days belong in their profile, and the queue should prefer —
or at least mark — cases whose days overlap.

### 2. Say what it costs

A patient's first question is "how much". سنون currently answers it nowhere. The
university may charge for materials even where the treatment is free, and that
is exactly the kind of surprise that makes someone not turn up.

This is not payments, which stay out of the MVP. It is one admin-editable
sentence per college, shown before a patient submits. Cheap, and it removes the
biggest unknown in the whole flow.

### 3. What the student still needs

A student is here because their college asks for a set number of specific cases.
ClinMatch has them state that as a listing; سنون can capture the same fact
without inverting the product — "I still need 3 fillings and one root canal" on
the student's profile — and use it to order their queue.

It makes the queue useful rather than merely correct, and it is the honest input
to the fair-distribution question (open decision 1) that is currently guesswork.

### 4. The college as a participant — later, and only with a real relationship

ClinMatch's program workspace solves a bottleneck سنون will hit: today Haider
approves every student ID by hand. A supervisor who can vouch for their own
students removes that, and makes the platform something a college adopts rather
than tolerates.

Not now. It needs an institutional relationship before it needs code, and
CLAUDE.md is right that manual review is correct at this scale.

### Deliberately not taking

- **Ratings and feedback on students.** Excluded in the MVP, and rightly: a
  student practising under supervision is not a service provider being reviewed.
  A private "did the treatment happen" check to the patient is a different thing
  and might be worth it — it would be a check on the outcome the student
  reported.
- **Students posting listings.** The whole design of سنون rests on cases being
  clinical cases rather than students advertising for patients. The guide is
  explicit: no browsing people, no ranking, no competing for patients.
- **Case review before matching.** It adds a person to the critical path when
  there is one person. The wrong-number report and the rate limits already cover
  the abuse it would catch.

## The thing worth saying out loud

AsnanLink is the same idea, in Arabic, one country away, and already live. That
is not a reason to hurry — it is a reason to be clear about what سنون is for.
Their patients register; سنون's do not, and in Iraq that friction is the
difference between someone submitting and someone giving up. That advantage is
worth defending over adding features to match them.

## Sources

- <https://www.clinmatch.io/>
- <https://www.clinmatch.io/colleges>
- <https://www.clinmatch.io/help>
- <https://www.asnanlink.app/en>
- <https://www.asnanlink.app/en/how-it-works>

---

## AsnanLink's actual design, from screenshots (11 Sep 2026)

Haider sent 39 screenshots. This is what they do, and what سنون should take.

### Their visual vocabulary

- **A logo.** A tooth outline containing a person, plus a wordmark and a tagline
  ("Linking Skills and Smiles"). سنون has text in a system font.
- **A sticky header carrying one primary action** — a solid blue "Join Early
  Access →" pill that never leaves the screen — plus a language toggle and a
  hamburger opening a short list: How it works · FAQs · Safety & Guidelines ·
  login.
- **An announcement bar** above the header for the one time-sensitive thing.
- **A hero with something to look at**: a 3D phone on a blue blob, with floating
  cards acting out a match — "Patient A needs a crown fix", "Student B is
  specializing in crown fixing", "It's A Match!".
- **Two-tone headlines** — accent word, then dark: "**Affordable** Dental Care."
- **Eyebrow pills** above headings: "University supervised Dental care".
- **Full-bleed accent bands** alternating with white, so the page has rhythm
  rather than being one continuous column of cards.
- **Soft-shadowed cards with generous radii**, each step with a circled icon.
- App-like components: FAQ accordions, a segmented Patients/Students toggle,
  pagination, a closing "Ready to get started?" band, a real footer.

### Their patient form

The direct comparison with ours, and the most useful page they sent:

- A **three-step wizard** with a stepper across the top — tell us your problem →
  your details → confirm phone — the finished step showing a tick.
- A warm, human heading in accent blue: **"What's bothering you today?"**, not
  "submit a case".
- Fields grouped under **small-caps section headers**: PERSONAL INFORMATION,
  CONTACT.
- **Accent-coloured labels** with a red asterisk, and **filled grey inputs**
  rather than bordered white ones.
- Binary choices as **segmented button pairs**, not a `<select>`.
- A reassurance line under the phone: *"We only use your number to connect you
  with a student. No spam, no sharing."*
- A Back / primary pair at the bottom.

### What we should take

The whole visual vocabulary above. None of it is specific to them — it is simply
what a finished product looks like, and سنون currently has none of it because the
tokens are deliberate placeholders.

Worth stealing outright: the human question as a heading, the small-caps section
grouping, the reassurance line under the phone field (we have a stronger promise
to make than they do), accent labels, and icons on the "how it works" steps.

### What we should not take, and why

- **"Confirm phone" as step three.** That is an SMS OTP, which costs money per
  message and is excluded across this project. Worth noticing that this is *their*
  answer to the wrong-number problem and it is the expensive one; ours is the
  report-and-cooldown, which is free and which they cannot do because their
  patients register.
- **The multi-step wizard.** It makes a long form feel shorter, and it adds round
  trips and state to lose on a connection that drops — against non-negotiable 7
  and against the rule that a rejected form must never empty itself. One page that
  never loses what was typed is better here. Section headers give most of the
  benefit without the risk.
- **Date of birth and gender.** We do not collect them and should not start:
  every field on a patient record needs a reason, and matching does not use these.

---

## ClinMatch's actual design, from Haider's screen recording (11 Sep 2026)

Neither WebFetch nor a headless browser can reach clinmatch.io from here, so this
is read from a 255-second recording of the site on a phone — thirteen frames
across the landing page, the listings page, sign-in, sign-up and the college
portal.

### Their visual vocabulary

- **The hero is dark** — near-black with a green-black wash — and the rest of the
  site is light. The dark band is used deliberately, at the top and at the
  closing call to action, so the page is bracketed rather than uniform.
- **A teal→cyan gradient** carries every primary button. This is worth noting:
  their accent and ours are nearly the same hue, arrived at independently. Teal
  is where dental-adjacent products land because blue is corporate and green is
  pharmacy.
- **Logo**: a stethoscope in a rounded green square, with a two-tone wordmark —
  dark "Clin", accent "Match". Same pattern AsnanLink uses.
- **Two-tone headlines** again: "…meets **dental education**".
- **Dual CTAs, one per audience**, side by side in the hero: a filled gradient
  "Find a Student Near Me" and an outlined "Find Patients — It's Free".
- **A search panel floating in the hero** — service, city, Search — so the first
  thing on the page is the thing the site does.
- **Treatment chips with tick icons** under the search: Cleaning & Prophylaxis ·
  Dental Exam · X-Rays · Fillings · Extraction · Root Canal · Dentures ·
  Orthodontics. They double as trust signals and as an answer to "what can I
  actually get here?".
- **Feature cards with a coloured rounded-square icon** at the top left, each
  icon a different hue against the same card.
- **A horizontal carousel of numbered steps**, each with its own illustration and
  dot pagination — "4 Connect and schedule through the supervised program".
- **A persistent app-download banner** pinned to the bottom of every page.
- FAQ accordions with +/− toggles, a fat dark footer in three columns (FOR
  PATIENTS · FOR STUDENTS · COMPANY), pagination as numbered squares.

### Their listings page — the closest thing to our student queue

This is the page worth studying, even though their listings run the other way
round (students advertise, patients browse; سنون has patients submit and students
claim). The card anatomy transfers almost exactly:

- **A coloured ribbon across the top of the card** carrying a one-word status and
  a sentence of detail — green "Free · Free for uninsured patients who meet
  eligibility criteria", blue "Low Cost · $30–$75 per filling depending on size".
- A **"Featured" pill**, then **`Listing ID 677-5544`** in small grey type —
  exactly the role our reference code plays.
- A **plain-language title**, then **treatment chips** with a `+1 more` when they
  overflow.
- **Icon rows**: pin + city, calendar + date range, clock + the days and hours
  with the timezone spelled out.
- **A warning row in orange**: "Program review required".
- **A footer**: circular avatar with an initial, name, a **verified tick**, role
  label, a view count and the posting date.
- Above the list: a search box with a Search button, three selects (country,
  region, price), a "More filters" button, a **result count** — "13 listings for
  …" — and a **grid/list toggle**.

### Their disclaimer, which they repeat everywhere

An amber band above the listings and again above the footer: *ClinMatch is a
marketplace… does not provide healthcare services, medical advice, diagnosis,
treatment, emergency services, clinical screening, or eligibility decisions. Do
not submit personal health information, symptoms, diagnosis details, medications,
or emergency concerns through ClinMatch.* Sign-up will not proceed until a
checkbox saying "I understand ClinMatch is a marketplace and **not a healthcare
provider**" is ticked.

### Their sign-in and sign-up

- An **illustration band** at the top of the page, then an eyebrow ("SIGN IN"), a
  warm headline ("Welcome back"), and a reassurance — "Takes less than 10
  seconds", "Under 30 sec" as a pill.
- Google and Apple first, email collapsed behind a disclosure. "Fastest option.
  No password needed."
- Sign-up opens with **two role cards** — "I'm a Patient / Find affordable
  treatment / Save up to 60%" and "I'm a Student / Complete clinical hours / Find
  real patients" — the selected one outlined in accent with a tick.

### A college portal

A third audience we do not have: "A program workspace for student patient needs",
giving coordinators and faculty a shared view of linked students, active
listings, patient leads and monthly views, with a "Request a program pilot" CTA.
Framed carefully — "Keep student autonomy, add institutional visibility".

### What we should take

1. **The case card anatomy.** Our student queue is a flat list; theirs is a card
   with a status ribbon, a reference code, chips, icon rows and a footer. Every
   one of those has a direct equivalent in سنون, and several are things a student
   currently has to read a sentence to find out.
2. **A status ribbon in the case's own colour.** We have more statuses than they
   do and they matter more — MATCHED, CONTACTED, APPOINTMENT_CONFIRMED — and the
   student's queue currently says them in grey text.
3. **A result count and a filter row.** The queue will be short at launch and
   long later; "٣ حالات" above it costs nothing and orients immediately.
4. **Chips for treatments, with the un-treatable ones visibly marked.** We
   already compute that distinction for two-stage cases and currently render it
   as prose.
5. **The eyebrow + warm headline + reassurance pattern on every form page**, not
   just the landing page. "خلّينا نعرف شنو يزعجك" reads like a person; "نموذج
   حالة جديدة" reads like a form.
6. **Icon rows instead of label/value pairs.** A pin, a calendar and a clock are
   read faster than three Arabic labels, and they survive a narrow screen.
7. **A real footer**, in columns, with the two audiences separated.

### What we should not take, and why

- **Prices, "Save up to 60%", and any competitive framing between students.**
  Treatment at سنون is at the university clinic under university terms. Pricing
  is not ours to state, and ranking or featuring students is explicitly out of
  the MVP.
- **A "Featured" pill.** That is an ad slot. It is the mechanism by which a
  matching platform becomes a marketplace, and it is exactly the "students
  shopping for patients" feel the guide forbids.
- **View counts on a case.** A patient's case is not content with an audience.
- **Google/Apple sign-in.** Worth revisiting for students later; it is not free
  of setup and it is not the thing blocking sign-up — email is.
- **The app-download banner.** There is no app and there will not be one.
- **Their disclaimer's framing.** We should say plainly what سنون is and is not,
  and `/privacy` and `/terms` already do — but "do not submit health information"
  is wrong for us. Patients *do* tell us what treatment they need and may send
  intraoral photographs; that is the product. Their disclaimer is written to keep
  a US marketplace out of clinical liability, and copying it would contradict our
  own form.
- **The college portal.** A genuinely good idea and the right shape for a v2
  conversation with a dental college — but it needs a real relationship with a
  real college first, and we do not yet know which colleges run a teaching clinic
  that takes outside patients.
