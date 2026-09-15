/**
 * The guided questions — "الأسئلة الموجّهة".
 *
 * A patient who knows they want a filling ticks the box and moves on. A patient
 * whose tooth simply hurts does not know what to tick, and the case form's own
 * hint ("إذا مو متأكد، اختر الأقرب لحالتك") is an admission that سنون had no
 * answer for them. This is the answer: a few plain questions, each one narrowing
 * to the next, ending either in a set of treatments to tick or in "this is not
 * something a student clinic should handle".
 *
 * Taken from AsnanLink, who do the same thing — and deliberately **not** taken
 * from عالجني, who claim a diagnosis from a photograph. See CLAUDE.md.
 *
 * ## Four rules, and none of them is a style preference
 *
 * 1. **It never diagnoses, and the copy must never read as a diagnosis.** Every
 *    leaf says what it *resembles* and what the student will look at, never what
 *    the patient has. سنون matches people and delivers no care; a sentence like
 *    "عندك التهاب عصب" makes it a care provider, in a country where that carries
 *    real regulatory weight and in a product that has no examining dentist.
 *    Write `يشبه` and `الطالب راح يشخّص`, never `عندك`.
 * 2. **A result is a set of treatment slugs and nothing else.** Those slugs are
 *    the same ones the case form's checkboxes carry and the same ones Payload
 *    seeds, so the whole output of this tree is "which boxes to tick". It
 *    produces no text that lands on the case and no field that did not already
 *    exist.
 * 3. **The path is never stored.** Which answers somebody chose is health
 *    information about them; the treatments they end up asking for are what
 *    سنون already collects and needs. Data minimisation is non-negotiable 6, and
 *    "we could analyse it later" is not a reason. Only the slugs cross into the
 *    form.
 * 4. **Some answers must not end in a treatment at all.** A swollen face with a
 *    fever, bleeding that will not stop, a mouth ulcer that has lasted weeks —
 *    these belong in a hospital today, not in a queue for a student appointment
 *    that may be a week away. A triage tree without exits is worse than no tree,
 *    because it routes everything into the one place it knows.
 *
 * ## This content is a DRAFT and must not launch unreviewed
 *
 * The machinery is finished; the clinical content is not. Every question, every
 * answer and above all every `referral` below was written by Claude, which is
 * not a dentist. Haider is. Nothing here should be shown to a real patient until
 * he has gone through it line by line — and the referrals are the ones that
 * matter, because a missing exit sends somebody who needs a hospital into a
 * queue instead.
 *
 * It lives here as typed data rather than in Payload because the *shape* has to
 * be right before the wording is worth editing, and a recursive tree is an
 * awkward Payload collection. Moving it there later is a migration, not a
 * redesign: the ids and slugs are already the join keys.
 */

/** A treatment slug, matching `TREATMENT_TYPES` in `src/payload/seed.ts`. */
export type TreatmentSlug = string

export type TriageAnswer = {
  label: string
  /** The id of the node this answer leads to. */
  next: string
}

export type TriageNode =
  | {
      kind: 'question'
      id: string
      text: string
      hint?: string
      answers: readonly TriageAnswer[]
    }
  | {
      kind: 'result'
      id: string
      title: string
      body: string
      /** What to tick on the case form. Never anything else. */
      treatments: readonly TreatmentSlug[]
    }
  | {
      kind: 'referral'
      id: string
      title: string
      body: string
      /**
       * Why this ends outside سنون. Three different things, and conflating them
       * would be a real harm in both directions:
       *
       * - `now`   — a hospital today. Time matters.
       * - `soon`  — a dentist, not a student, and do not put it off.
       * - `scope` — nothing is wrong medically; this treatment is simply not
       *             one a student at a university clinic may perform. Somebody
       *             reading this must not think they are in danger, and must
       *             not be left thinking سنون could have helped.
       */
      urgency: 'now' | 'soon' | 'scope'
    }

export const TRIAGE_ROOT = 'start'

export const TRIAGE_TREE: readonly TriageNode[] = [
  {
    kind: 'question',
    id: 'start',
    text: 'شنو اللي مضايقك أكثر شي؟',
    hint: 'اختر الأقرب لحالتك. إذا عندك أكثر من شي، ابدأ بالأهم.',
    answers: [
      { label: 'عندي ألم بسن', next: 'pain' },
      { label: 'عندي سن مكسور أو متآكل', next: 'broken' },
      { label: 'لثتي تنزف أو أكو جير ورائحة', next: 'gums' },
      { label: 'عندي سن أو أسنان مفقودة', next: 'missing' },
      { label: 'أسناني مو منتظمة وأريد تقويم', next: 'result-ortho' },
      { label: 'حالة طفل أقل من ١٢ سنة', next: 'result-paediatric' },
      { label: 'ما أدري — أريد بس فحص', next: 'result-exam' },
      { label: 'وجهي منتفخ أو عندي حرارة', next: 'urgent-swelling' },
    ],
  },

  {
    kind: 'question',
    id: 'pain',
    text: 'شلون الألم؟',
    answers: [
      { label: 'يجي لمن آكل حلو أو بارد، ويروح بسرعة', next: 'result-filling' },
      { label: 'ألم قوي يستمر، وأشدّ بالليل', next: 'rootcanal-which' },
      { label: 'يوجعني بس لمن أعضّ عليه', next: 'result-exam-pain' },
      { label: 'ألم وية انتفاخ بالوجه أو حرارة', next: 'urgent-swelling' },
    ],
  },

  /*
   * Which tooth, and this question exists for a clinical reason Haider gave:
   * **a student may not root-fill a back molar.** Molars carry several roots and
   * several canals, and a university clinic does not let a fourth or fifth year
   * attempt them. Premolars and anterior teeth are mostly single-rooted and are
   * ordinary student work.
   *
   * A premolar with two roots sits in between, and the patient is deliberately
   * **not** told that: "قد ينفع وقد ما ينفع" is a sentence that helps nobody
   * standing in front of a form. It goes through as a student case and the
   * student decides at the chair, which is where that call belongs.
   *
   * The answers are written so somebody can actually pick one about their own
   * mouth — by position and by what they chew with — rather than by name.
   */
  {
    kind: 'question',
    id: 'rootcanal-which',
    text: 'أي سن اللي يوجع؟',
    hint: 'حدد مكانه بفمك — هذا يقرر إذا الطالب يكدر يعالجه بعيادة الجامعة.',
    answers: [
      { label: 'سن من قدام — من اللي يبين لمن أضحك', next: 'result-rootcanal' },
      { label: 'ضرس صغير بالنص، بين الأمامية والطواحين', next: 'result-rootcanal' },
      { label: 'ضرس كبير من الآخر (طاحونة)', next: 'scope-molar-rct' },
      { label: 'ما أدري بالضبط', next: 'result-exam-rct' },
    ],
  },

  {
    kind: 'question',
    id: 'broken',
    text: 'شلون السن؟',
    answers: [
      { label: 'كسر بسيط وما يوجع', next: 'result-filling' },
      { label: 'متآكل هواي أو أسود', next: 'result-filling' },
      { label: 'مكسور للجذر أو متحرك هواي', next: 'result-extraction' },
      { label: 'انكسر بضربة أو حادث قبل شوية', next: 'urgent-trauma' },
    ],
  },

  {
    kind: 'question',
    id: 'gums',
    text: 'شنو تلاحظ بلثتك؟',
    answers: [
      { label: 'تنزف لمن أفرّش، وأكو جير', next: 'result-scaling' },
      { label: 'أسناني صارت متحركة', next: 'result-scaling' },
      { label: 'أكو قرحة أو بقعة ما راحت من أكثر من أسبوعين', next: 'urgent-lesion' },
    ],
  },

  {
    kind: 'question',
    id: 'missing',
    text: 'قد إيش سن ناقص؟',
    answers: [
      { label: 'سن أو كم سن، وباقي أسناني موجودة', next: 'result-partial' },
      { label: 'أغلب أسناني أو كلها', next: 'result-complete' },
    ],
  },

  // ---- Results. Each one is a set of boxes to tick, and a sentence that says
  // what it resembles rather than what it is. ---------------------------------

  {
    kind: 'result',
    id: 'result-exam',
    title: 'تبدأ بفحص',
    body: 'الطالب راح يفحصك ويحدد شنو تحتاج. هذا الشي الطبيعي إذا مو متأكد، وما يكلفك شي زيادة.',
    treatments: ['examination'],
  },
  {
    kind: 'result',
    id: 'result-exam-pain',
    title: 'تحتاج فحص للسن هذا',
    body: 'الألم عند العضّ بس ممكن يكون أسباب هوايا، وما ينعرف بدون ما الطالب يشوف السن ويصوّره.',
    treatments: ['examination'],
  },
  {
    kind: 'result',
    id: 'result-filling',
    title: 'يشبه حالة تحتاج حشوة',
    body: 'اللي وصفته قريب من التسوّس. الطالب راح يشخّص الحالة بنفسه ويقرر، وممكن يطلع محتاج شي ثاني.',
    treatments: ['filling'],
  },
  {
    kind: 'result',
    id: 'result-rootcanal',
    title: 'يشبه حالة تحتاج علاج عصب',
    body: 'ألم قوي ومستمر وأشدّ بالليل غالباً يوصل للعصب. القرار النهائي للطالب بعد الفحص والصورة.',
    treatments: ['root-canal'],
  },
  {
    kind: 'result',
    id: 'result-exam-rct',
    title: 'تبدأ بفحص',
    body: 'ما دام مو متأكد أي سن، الطالب راح يفحصك ويحدد. إذا طلع ضرس كبير من الآخر، راح يدلّك على طبيب لأن هذا النوع ما ينعالج بعيادة الجامعة.',
    treatments: ['examination'],
  },
  {
    kind: 'result',
    id: 'result-extraction',
    title: 'يشبه حالة تحتاج قلع',
    body: 'سن مكسور للجذر أو متحرك هواي غالباً ما ينفع يتحشّى. الطالب راح يشوف إذا أكو مجال ينقذه.',
    treatments: ['extraction'],
  },
  {
    kind: 'result',
    id: 'result-scaling',
    title: 'يشبه حالة تحتاج تنظيف',
    body: 'نزف اللثة والجير يعالجون بالتنظيف بالعيادة. إذا أكو أسنان متحركة، الطالب راح يقيّم اللثة أكثر.',
    treatments: ['scaling'],
  },
  {
    kind: 'result',
    id: 'result-partial',
    title: 'يشبه حالة تحتاج طقم جزئي',
    body: 'تعويض سن أو كم سن مع بقاء باقي الأسنان. الطالب راح يقيس ويقرر النوع المناسب.',
    treatments: ['partial-denture'],
  },
  {
    kind: 'result',
    id: 'result-complete',
    title: 'يشبه حالة تحتاج طقم كامل',
    body: 'تعويض الأسنان كلها. هذا علاج ياخذ أكثر من موعد، والطالب راح يشرحلك الخطوات.',
    treatments: ['complete-denture'],
  },
  {
    kind: 'result',
    id: 'result-ortho',
    title: 'تقويم أسنان',
    body: 'التقويم علاج طويل ويحتاج مواعيد منتظمة لمدة طويلة. الطالب راح يشرحلك المدة قبل ما تبدأ.',
    treatments: ['orthodontics'],
  },
  {
    kind: 'result',
    id: 'result-paediatric',
    title: 'أسنان الأطفال',
    body: 'حالات الأطفال إلها طلبة مختصين بيها. لازم يكون ولي الأمر ويّا الطفل بالموعد.',
    treatments: ['paediatric'],
  },

  // ---- The exits. These are the reason a tree like this is safe to build at
  // all, and they are the part that needs a dentist's eye most. ---------------

  {
    kind: 'referral',
    id: 'urgent-swelling',
    urgency: 'now',
    title: 'هذا ما ينطر موعد',
    body: 'انتفاخ بالوجه أو حرارة ويّا ألم سن ممكن يكون التهاب ينتشر، وهذا شي يحتاج علاج بنفس اليوم. روح لأقرب مستشفى أو طوارئ أسنان هسه، ولا تنطر موعد من سنون.',
  },
  {
    kind: 'referral',
    id: 'urgent-trauma',
    urgency: 'now',
    title: 'هذا ما ينطر موعد',
    body: 'إذا انكسر أو انقلع سن بضربة أو حادث، الوقت مهم هواي — أحياناً يمكن إنقاذ السن إذا وصلت بسرعة. روح لأقرب مستشفى أو طوارئ أسنان هسه.',
  },
  {
    kind: 'referral',
    id: 'scope-molar-rct',
    urgency: 'scope',
    title: 'هذا ما ينعالج بعيادة الجامعة',
    body: 'علاج عصب الطواحين (الأضراس الكبيرة من الآخر) ما يسوونه الطلبة بعيادة الجامعة، لأن الطاحونة عدها أكثر من جذر وأكثر من قناة. راجع طبيب أسنان — مو حالة مستعجلة، بس لا تأجّلها لأن الألم راح يزيد.',
  },

  {
    kind: 'referral',
    id: 'urgent-lesion',
    urgency: 'soon',
    title: 'راجع طبيب مو طالب',
    body: 'قرحة أو بقعة بالفم باقية أكثر من أسبوعين لازم يشوفها طبيب مختص، مو طالب بعيادة جامعية. راجع طبيب أسنان أو مستشفى قريب ولا تأجّلها.',
  },
]
