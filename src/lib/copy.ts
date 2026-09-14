/**
 * All user-facing Arabic copy lives here.
 *
 * Copy is data, not final. Nothing user-facing should be a string literal in a
 * component — when the wording changes (and it will), it changes in this file
 * only. No interpolation of patient names or phone numbers into copy, ever.
 */

/**
 * `name` is the bare word for the wordmark and for running text where "سنون"
 * is the subject of a sentence. `platform` is what سنون is *called* — Haider's
 * instruction, and it earns its place: a bare "سنون" beside a hospital's name
 * reads as a clinic, and the one thing this must never be mistaken for is the
 * place the treatment happens. It also leaves room for the other things that
 * will carry the name later — متجر سنون, and a نظام سنون للعيادات if that
 * happens — so "منصة سنون" is the one that means this product specifically.
 */
export const site = {
  name: 'سنون',
  platform: 'منصة سنون',
  nameLatin: 'SNOON',
  tagline: 'نوصّل بين المراجع وطالب طب الأسنان',
  description:
    'العلاج يكون في عيادة الجامعة وتحت إشراف الأساتذة. منصة سنون توصّل بس — ما تقدّم علاج وما توظّف أحد.',
} as const

export const nav = {
  home: 'الرئيسية',
  forPatients: 'للمراجعين',
  forStudents: 'للطلبة',
  supplies: 'المستلزمات',
  skipToContent: 'انتقل إلى المحتوى',
} as const

/**
 * The three landing entry points. `supplies` is intentionally present and
 * intentionally disabled — the marketplace is a later phase, but the navigation
 * model keeps its place so it does not have to be retrofitted.
 */
export const landing = {
  patient: {
    title: 'أحتاج علاج أسنان',
    body: 'قدّم حالتك وحدد مدينتك ووقتك المناسب، وراح يتواصل وياك طالب من عيادة الجامعة.',
    action: 'قدّم حالة',
    note: 'ما تحتاج حساب.',
  },
  student: {
    title: 'أنا طالب طب أسنان',
    body: 'شوف الحالات العلاجية المتاحة اللي تناسب مرحلتك وعيادتك، واحجز الحالة اللي تحتاجها.',
    action: 'دخول الطلبة',
    note: 'يحتاج توثيق من إدارة سنون.',
  },
  supplies: {
    title: 'مستلزمات طب الأسنان',
    body: 'مواد وأدوات للطلبة والأطباء، ومنتجات العناية بالفم للمراجعين.',
    action: 'قريباً',
    note: 'لسه ما متوفر.',
  },
} as const

/**
 * What it costs. This is the answer to the question the FAQ used to dodge.
 *
 * Haider: some universities charge a symbolic fee for services their own
 * students provide, usually no more than 5,000 د.ع, and the student explains
 * the exact price — and the cost of better materials where a choice exists —
 * before anything starts.
 *
 * Why it is one shared string used in three places rather than three
 * sentences: a patient who arrives expecting free treatment and is asked for
 * money is precisely the harm this project exists to prevent, so the same
 * words have to appear on the landing page, in the FAQ, and on the form
 * *before* they submit. Three wordings would drift, and the one that drifts is
 * the one somebody reads.
 *
 * It says "some universities" because it is not known which. When that is
 * known per college it belongs in Payload beside the college, not here.
 */
export const fees = {
  short: 'منصة سنون ما تاخذ فلوس منك ولا من الطالب.',
  long:
    'منصة سنون ما تاخذ فلوس منك ولا من الطالب. بس بعض الجامعات تاخذ أجور رمزية ' +
    'على الخدمات اللي يقدمها طلابها، وغالباً ما تتجاوز 5,000 د.ع. الطالب راح ' +
    'يوضّحلك السعر المضبوط قبل ما تبدون، وإذا اكو خيار مواد أحسن يخبرك بكلفته.',
} as const

export const howItWorks = {
  title: 'شلون يشتغل',
  steps: [
    'المراجع يقدّم حالته: المدينة، نوع العلاج المطلوب، والأوقات اللي يكدر يجي بيها.',
    'الطالب الموثّق يشوف الحالات اللي تناسب مرحلته وعيادته، ويحجز وحدة منها.',
    'بعد الحجز بس، تظهر للطالب معلومات التواصل، ويتواصل وية المراجع ويحدد الموعد.',
    'العلاج يصير بعيادة الجامعة وتحت إشراف الأساتذة.',
  ],
} as const

/**
 * The landing page's own copy.
 *
 * Separate from `landing`, which holds the three entry points, because this is
 * the page talking rather than the page offering.
 */
export const home = {
  backToHome: 'الرئيسية',
  eyebrow: 'علاج أسنان بإشراف جامعي',

  /** Two-tone: the first half takes the accent, the second stays dark.
      "علاج أسنان تكدر توصله" is gone — Haider's call, and he is right that it
      reads as a slogan about reach rather than as what سنون does. The platform
      connects two people; the headline now says that and nothing else. */
  headlineAccent: 'نوصّل بينك',
  headlineRest: 'وبين طالب طب الأسنان',
  subhead:
    'طلبة طب الأسنان بالسنة الرابعة والخامسة يحتاجون حالات لدراستهم. انت تحتاج علاج. منصة سنون توصّل بينكم، والعلاج يصير بعيادة الجامعة تحت إشراف الأساتذة.',

  primaryAction: 'قدّم حالتك',
  secondaryAction: 'أنا طالب',

  /** Three short promises, under the fold on a phone but above it on a laptop. */
  promises: [
    { title: 'بدون عمولة', body: 'منصة سنون ما تاخذ فلوس منك ولا من الطالب.' },
    { title: 'بدون حساب', body: 'قدّم حالتك برابط واحد. ما تحتاج تسجّل.' },
    { title: 'تحت إشراف', body: 'العلاج بعيادة الجامعة ويشرف عليه الأساتذة.' },
  ],

  forPatients: 'للمراجعين',
  forStudents: 'للطلبة',

  studentsTitle: 'طالب طب أسنان؟',
  studentsBody:
    'شوف الحالات اللي تناسب مرحلتك وأيام دوامك بعيادتك، واحجز اللي تحتاجه لمتطلباتك. التسجيل يحتاج وثيقة تثبت إنك طالب.',
  studentsAction: 'دخول الطلبة',

  closingTitle: 'محتاج علاج أسنان؟',
  closingBody: 'قدّم حالتك بدقيقتين. ما تحتاج حساب، ومنصة سنون ما تاخذ منك فلوس.',

  /** The landing page's header menu. Two anchors, so it needs no hamburger and
      no JavaScript — both competitors script a drawer to hold four links. */
  navHow: 'شلون تشتغل',
  navFaq: 'أسئلة شائعة',
} as const

/**
 * The landing page's longer sections.
 *
 * Added after Haider compared سنون against ClinMatch and AsnanLink and said the
 * obvious true thing: theirs is several times the length of ours. The gap was
 * never polish — it was that our page answered almost none of the questions a
 * patient actually arrives with. What can I get? Does it work in my city? What
 * happens to my phone number? Who treats me?
 *
 * Every claim below is one the product can keep. Nothing here invents a price,
 * a waiting time, a testimonial or a number of users, because we have none of
 * those and a landing page that overstates is the fastest way to lose the trust
 * this one exists to build.
 */

/** Four short facts under the hero, the ones a patient checks first. */
/**
 * The bridge diagram in the hero — `MatchBridge`.
 *
 * Two words and a sentence. They carry the whole picture: without the labels it
 * is two coloured shapes, and with them it is what سنون does.
 *
 * `name` is the wordmark on the line and is deliberately the plain spelling the
 * rest of the site uses, not the logo. When a logo exists it replaces the badge,
 * and this string goes with it.
 */
export const bridge = {
  student: 'طالب',
  patient: 'مراجع',
  name: 'سنون',
  caption: 'سنون يوصّل بين الاثنين. هو ما يعالج، وما يشغّل أحد.',
  alt: 'رسم: طالب طب أسنان من جهة، ومراجع من الجهة الثانية، وبينهما خط يوصلهما وعليه اسم سنون.',
} as const

export const trustRow = [
  'منصة سنون بدون عمولة',
  'العلاج بعيادة الجامعة',
  'بإشراف الأساتذة',
  'بدون حساب',
] as const

/**
 * What you can actually get. The single biggest thing the page was missing:
 * a patient's first question is whether their problem is even covered, and
 * سنون never said. The list is read from Payload, so it stays true when an
 * admin edits it.
 */
export const treatmentsSection = {
  eyebrow: 'العلاجات',
  title: 'شنو تكدر تعالج بسنون؟',
  body: 'هذي العلاجات اللي يقدرون الطلبة يسوونها بعيادة الجامعة. اختار وحدة أو أكثر بالطلب — أغلب الناس يحتاجون أكثر من شي.',
  note: 'مو كل علاج متوفر بكل مرحلة — بعضها للسنة الرابعة وبعضها للخامسة. سنون يوصّل حالتك للطالب اللي يقدر يسويها.',
} as const

/**
 * The trust section, and the one part of this page سنون can say that neither
 * competitor can. Every line is a thing the code actually does.
 */
export const safetySection = {
  eyebrow: 'خصوصيتك',
  title: 'شنو يصير بمعلوماتك؟',
  body: 'رقم موبايلك هو أهم شي تنطينا إياه، ونتعامل وياه على هذا الأساس.',
  points: [
    {
      title: 'رقمك ما يشوفه إلا طالب واحد',
      body: 'ولا يشوفه إلا بعد ما ياخذ حالتك فعلاً. قبلها ما يشوف غير نوع العلاج والمدينة والأيام.',
    },
    {
      title: 'الصور تنظّف قبل ما تنحفظ',
      body: 'صورة الموبايل تحمل مكان التقاطها بداخلها. سنون يشيل هذي المعلومة من كل صورة قبل حفظها.',
    },
    {
      title: 'معلومات التواصل تنمحي',
      body: 'بعد ما تنتهي حالتك بمدة محددة، اسمك ورقمك وملاحظاتك تنمحي من عدنا. رمز الحالة يبقى إذا احتجت تسأل.',
    },
    {
      title: 'ما نسأل عن شي ما نحتاجه',
      body: 'ما نطلب تاريخ ميلاد ولا عنوان ولا تاريخك المرضي. بس اللي يحتاجه الطالب حتى يعرف يقدر يساعدك لو لا.',
    },
  ],
} as const

/** Where سنون works. Read from Payload, like the treatments. */
export const citiesSection = {
  eyebrow: 'المدن',
  title: 'سنون بمدينتك؟',
  body: 'تكدر تقدّم حالتك من أي مدينة بهذي القائمة. عدد الطلبة يختلف من مدينة لأخرى، فبعض المدن الرد بيها أسرع.',
  /** Said plainly rather than hidden: an empty queue is not a broken site. */
  note: 'سنون لسه جديد. إذا ما وصلك رد بسرعة، يعني ما أكو طالب متفرّغ بمدينتك هسه — حالتك تبقى بالقائمة.',
} as const

/**
 * The questions people actually ask, with answers the product can keep.
 *
 * Rendered as native <details>, so the accordion works with no JavaScript at
 * all — the same reason every other interaction on this page is a link or a
 * form. Both competitors use a scripted accordion; this one is free.
 */
export const faqSection = {
  eyebrow: 'أسئلة',
  title: 'أسئلة تتكرر',
  items: [
    {
      q: 'شكد راح يكلفني؟',
      a: 'منصة سنون ما تاخذ فلوس منك ولا من الطالب، وما عدنا اشتراك ولا عمولة. بس بعض الجامعات تاخذ أجور رمزية على الخدمات اللي يقدمها طلابها، وغالباً ما تتجاوز 5,000 د.ع. الطالب راح يوضّحلك السعر المضبوط قبل ما تبدون، وإذا اكو خيار مواد أحسن يخبرك بكلفته.',
    },
    {
      q: 'منو راح يعالجني؟',
      a: 'طالب طب أسنان بالسنة الرابعة أو الخامسة، داخل عيادة جامعته وتحت إشراف الأساتذة. الطلبة يحتاجون حالات حتى يكملوا متطلبات دراستهم — هذا سبب وجود سنون.',
    },
    {
      q: 'أحتاج أسوي حساب؟',
      a: 'لا. تقدّم حالتك وياخذ منك دقيقتين، وينطيك رمز ورابط تتابع بيه حالتك. الحساب اختياري إذا تحب تحتفظ بحالاتك بمكان واحد.',
    },
    {
      q: 'شكد يأخذ وقت حتى يتواصل وياي أحد؟',
      a: 'ما نكدر نوعدك بوقت. يعتمد على وجود طالب بمدينتك يحتاج نفس العلاج اللي تحتاجه وأيامه تناسب أيامك. أول ما يحجز طالب حالتك يوصلك إشعار.',
    },
    {
      q: 'إذا ما تواصل وياي أحد؟',
      a: 'إذا الطالب ما تواصل وياك خلال المدة المحددة، حالتك ترجع للقائمة تلقائياً ويقدر طالب ثاني ياخذها. وتكدر تخبرنا من رابط حالتك إنه ما وصلك اتصال.',
    },
    {
      q: 'الصور ضرورية؟',
      a: 'لا، اختيارية. بس تساعد الطالب يعرف إذا يقدر يعالج حالتك قبل ما يحجزها، فتوفر وقت عليك وعليه. لا تصوّر وجهك — صورة الأسنان بس.',
    },
    {
      q: 'ضيّعت رابط حالتي',
      a: 'تكدر تطلّع رابط جديد إذا تتذكر رمز الحالة ورقم الموبايل اللي قدّمت بيه، من صفحة «ضيّعت رابط حالتك؟».',
    },
    {
      q: 'أنا طالب — شلون أسجّل؟',
      a: 'سجّل بحسابك، حدد جامعتك وكليتك ومرحلتك وأيام دوامك، وارفع وثيقة تثبت إنك طالب. إدارة سنون تراجعها، وبعدها تشوف الحالات اللي تناسب مرحلتك.',
    },
  ],
} as const

export const footer = {
  /** Columns by audience — a patient and a student want different links. */
  forPatients: 'للمراجعين',
  forStudents: 'للطلبة',
  submitCase: 'قدّم حالة',
  howItWorks: 'شلون تشتغل',
  findCase: 'ضيّعت رابط حالتك؟',
  myCases: 'حالاتي',
  studentSignUp: 'سجّل كطالب',
  studentDashboard: 'حسابي',

  disclaimer:
    'سنون منصة توصيل بين المراجعين وطلبة طب الأسنان. العلاج يقدّمه الطالب داخل عيادة الجامعة وتحت إشراف جامعي. سنون ما يقدّم خدمة طبية وما يتحمل مسؤولية العلاج.',
  privacy: 'الخصوصية',
  terms: 'الشروط',
} as const

/**
 * Labels for the case lifecycle in CLAUDE.md. Keys match the state names one to
 * one; the labels are what a patient or student reads. Transition rules live in
 * the domain layer, not here.
 */
export const caseStatus = {
  REQUESTED: 'بانتظار طالب',
  MATCHED: 'انحجزت من طالب',
  CONTACTED: 'تم التواصل',
  APPOINTMENT_CONFIRMED: 'الموعد مثبّت',
  COMPLETED: 'مكتملة',
  NO_CONTACT: 'ما وصل تواصل',
  RETURNED_TO_QUEUE: 'رجعت للقائمة',
  NO_SHOW: 'ما حضر',
  CANCELLED: 'ملغاة',
  EXPIRED: 'منتهية',
} as const

export const common = {
  loading: 'قيد التحميل…',
  errorTitle: 'صار خطأ',
  errorBody: 'ما كدرنا نكمل الطلب. جرّب مرة لخ.',
  notFoundTitle: 'الصفحة مو موجودة',
  notFoundBody: 'الرابط اللي فتحته مو صحيح أو انحذف.',
  backHome: 'رجوع للرئيسية',
  referenceCodeLabel: 'رمز الحالة',
  /** Shown where a phone number used to be, once retention has erased it. */
  contactScrubbed: 'انمحت بعد انتهاء مدة الاحتفاظ',

  /** Error pages. The default Next.js screen is English and says nothing useful. */
  errorRetry: 'جرّب مرة لخ',
  errorReference: 'رمز الخطأ',
  errorReferenceHint: 'إذا تكرر الخطأ، اذكر هذا الرمز لما تراجعنا.',
} as const

/** The patient case-submission form. */
export const caseForm = {
  eyebrow: 'حالة جديدة',
  title: 'شنو يوجعك؟',
  intro: 'كَلنا شنو تحتاج وراح نوصّلك بطالب طب أسنان بمدينتك. ما تحتاج حساب، وما تدفع شي لسنون.',

  /**
   * Section headers. AsnanLink groups its form this way and it is worth taking:
   * a long single-column form reads shorter when it has two or three named
   * parts, and it costs none of the round trips a multi-step wizard would.
   */
  sectionNeed: 'شنو تحتاج',
  sectionWhen: 'متى تكدر تجي',
  sectionContact: 'وين نوصلك',
  sectionExtra: 'معلومات إضافية',

  /** Under the phone field. The strongest promise this product makes. */
  phonePromise:
    'رقمك يظهر لطالب واحد بس — الطالب اللي ياخذ حالتك. ما ننشره، ما نبيعه، وما ندز عليه إعلانات.',

  cityLabel: 'المدينة',
  cityPlaceholder: 'اختر مدينتك',

  treatmentLabel: 'شنو العلاج اللي تحتاجه؟',
  treatmentHint: 'تكدر تختار أكثر من وحدة. إذا مو متأكد، اختر الأقرب لحالتك والطالب راح يشخّص.',

  daysLabel: 'أي أيام تكدر تجي؟',
  daysHint: 'اختر كل الأيام اللي تناسبك — كل ما تختار أكثر، تلكى طالب أسرع.',
  /**
   * The thing a patient cannot know and has to be told: a student is in clinic
   * on the days their timetable says, not on the days that suit the patient.
   * Without this the "can you come Saturday?" message later reads as the site
   * ignoring what they filled in.
   */
  daysNotice:
    'انتبه: الطلبة عندهم جدول جامعي ثابت وما يكدرون يشتغلون كل الأيام. إذا أكو طالب يكدر ياخذ حالتك بيوم ما اخترته، راح نسألك أول — وما ينحجز شي إلا إذا وافقت انت.',

  nameLabel: 'الاسم',
  nameHint: 'الاسم اللي يناديك بيه الطالب.',

  phoneLabel: 'رقم الموبايل',
  phoneHint:
    'اكتب رقمك انت — طالب راح يتصل بيه. الرقم يظهر بس للطالب اللي ياخذ حالتك، وما يظهر لأي أحد غيره.',

  notesLabel: 'ملاحظات (اختياري)',
  notesHint: 'أي شي تحب تذكره عن حالتك.',

  submit: 'أرسل الحالة',
  submitting: 'قيد الإرسال…',

  weekDays: {
    sat: 'السبت',
    sun: 'الأحد',
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
  },

  errors: {
    cityRequired: 'اختر مدينتك.',
    cityUnknown: 'هاي المدينة مو متوفرة حالياً.',
    treatmentRequired: 'اختر نوع علاج واحد على الأقل.',
    treatmentUnknown: 'واحد من أنواع العلاج المختارة مو متوفر حالياً.',
    daysRequired: 'اختر يوم واحد على الأقل.',
    daysInvalid: 'في يوم مو صحيح بالاختيار.',
    nameRequired: 'اكتب اسمك.',
    nameTooShort: 'الاسم قصير كلش.',
    nameTooLong: 'الاسم طويل كلش.',
    phoneRequired: 'اكتب رقم موبايلك.',
    phoneInvalid: 'الرقم مو صحيح. اكتبه هيچي: 07701234567',
    notesTooLong: 'الملاحظات طويلة كلش.',
    submitFailed: 'ما كدرنا نرسل الحالة. جرّب مرة لخ بعد شوية.',
    tooMany: 'أرسلت طلبات كثيرة بوقت قصير. انطر ساعة وجرّب مرة لخ.',

    /**
     * Written for the person whose number was misused, not for whoever misused
     * it: if the real owner ever comes to سنون themselves, this is how they
     * find out why they are refused and what to do about it.
     */
    phoneBlocked:
      'هذا الرقم موقوف مؤقتاً. طالب بلّغنا إن صاحب الرقم ما طلب علاج. إذا هذا رقمك وتريد علاج فعلاً، راجع إدارة سنون حتى نشيل الإيقاف.',
    phoneTooManyOpen:
      'أكو حالات مفتوحة بهذا الرقم. خلّص وحدة منها قبل ما تقدّم حالة جديدة.',
    phoneTooManyToday: 'قدّمت حالات كثيرة اليوم بهذا الرقم. جرّب باچر.',
  },
} as const

/** The page shown after a case is submitted, and the patient's tracking page. */
/**
 * The patient being asked whether they could come on a day they did not pick.
 *
 * Phrased as a question about a day, never about a person: the patient is not
 * choosing between students, and the product does not put people in a list.
 */
export const dayRequest = {
  title: 'أكو طالب يكدر ياخذ حالتك',
  body: (day: string) =>
    `أكو طالب يكدر ياخذ حالتك بس دوامه يوم ${day}، وانت ما اخترت هذا اليوم. تكدر تجي بيه؟`,
  yes: (day: string) => `إي، أكدر أجي ${day}`,
  no: 'لا، ما أكدر',

  accepted: 'تمام. انحجزت حالتك وراح يتصل بيك الطالب.',
  declined: 'تمام. ما راح نسألك عن هذا اليوم مرة لخ.',
  gone: 'هاي الحالة انحجزت من طالب ثاني.',
  failed: 'ما كدرنا نسجّل جوابك. جرّب مرة لخ.',
} as const

/**
 * Getting a lost tracking link back.
 *
 * Written for someone who thinks they have lost their case. The reassurance
 * matters more than the instructions: the first thing to say is that the case is
 * still there.
 */
/**
 * The optional patient account.
 *
 * Optional is the whole design. A patient submits a case, gets a link, and is
 * done — an account is somewhere to find their cases again if they want one, and
 * nothing in the product may ever require it. The copy has to say that plainly,
 * because a sign-in button on a medical form reads as a demand unless it is
 * explicitly told not to.
 */
export const patientAccount = {
  eyebrow: 'حسابك',
  title: 'حالاتك',
  lead: 'كل الحالات اللي قدّمتها وانت داخل بحسابك.',

  /** Offered beside the case form, and phrased so nobody thinks it is a step. */
  optionalTitle: 'تحب تحتفظ بحالاتك؟',
  optionalBody:
    'تكدر تدخل بحساب Google حتى تلگى حالاتك بأي وقت بدون ما تحتاج الرابط. اختياري تماماً — الحالة تنقدّم بدون حساب عادي.',
  signIn: 'المتابعة بحساب Google',
  signedInAs: 'داخل بحساب',
  signOut: 'خروج',

  attachTitle: 'تحتفظ بهذي الحالة بحسابك؟',
  attachBody: 'راح تلگاها بصفحة حالاتك حتى لو ضيّعت الرابط.',
  attach: 'خزّنها بحسابي',
  attaching: 'قيد الحفظ…',
  attached: 'انحفظت بحسابك. تلگاها بصفحة حالاتك.',
  linkedNote: 'هذي الحالة محفوظة بحسابك.',

  emptyTitle: 'ما أكو حالات بحسابك',
  emptyBody: 'الحالات اللي تقدّمها وانت داخل بحسابك راح تظهر هنا.',
  submitCase: 'قدّم حالة',

  /** Said once, where someone would reasonably wonder. */
  retentionNote:
    'الحالة القديمة تختفي من هنا بعد ما تنمحي معلومات التواصل حسب مدة الاحتفاظ — رمز الحالة يبقى عدنا إذا احتجت تسأل.',

  errors: {
    signInFirst: 'لازم تدخل بحسابك أول.',
    generic: 'ما كدرنا نحفظ الحالة بحسابك. جرّب مرة لخ.',
  },
} as const

export const caseRecovery = {
  eyebrow: 'متابعة حالة',
  title: 'ضيّعت رابط حالتك؟',
  lead: 'حالتك محفوظة. اكتب رمز الحالة ورقم الموبايل اللي قدّمت بيه، وراح نطلعلك رابط جديد.',
  linkLabel: 'ضيّعت الرابط؟',

  section: 'معلومات حالتك',
  codeLabel: 'رمز الحالة',
  codeHint: 'الرمز اللي انطاك إيانا وقت قدّمت الحالة، شكله SN-4KP7QW.',
  phoneLabel: 'رقم الموبايل',
  phoneHint: 'نفس الرقم اللي كتبته بالحالة.',
  submit: 'طلّعلي الرابط',
  submitting: 'قيد البحث…',

  /** Said on the form itself, because a new link means the old one dies. */
  reissueNote: 'الرابط القديم راح يبطّل يشتغل، والجديد هو اللي تحتفظ بيه.',

  errors: {
    bothRequired: 'اكتب رمز الحالة ورقم الموبايل.',
    /**
     * One message for every failure — a wrong code, wrong number, no such case, a
     * link that was revoked. Anything more specific tells whoever is guessing
     * which half to keep.
     */
    noMatch: 'ما لگينا حالة بهذا الرمز وهذا الرقم. تأكد منهم وجرّب مرة لخ.',
    tooMany: 'محاولات كثيرة. انطر ساعة وجرّب مرة لخ، أو راجعنا.',
  },
} as const

export const caseTracking = {
  yourDetails: 'معلوماتك',
  recoverLink: 'ضيّعت رابط حالتك؟',
  successTitle: 'انرسلت حالتك',
  successBody: 'راح يشوفها طلبة طب الأسنان بمدينتك، وأول ما يحجزها طالب راح يتصل بيك.',

  referenceLabel: 'رمز حالتك',
  referenceHint: 'احتفظ بيه. تحتاجه إذا تريد تسأل عن حالتك.',

  linkLabel: 'رابط متابعة حالتك',
  linkHint: 'احفظ هذا الرابط بالمفضلة. هو الطريقة الوحيدة تشوف بيها حالتك، وما ينرسل بأي مكان ثاني.',
  linkWarning: 'لا تشارك هذا الرابط مع أحد — أي شخص يفتحه يشوف معلوماتك.',

  statusLabel: 'حالة الطلب',
  submittedAtLabel: 'تاريخ الإرسال',
  cityLabel: 'المدينة',
  treatmentLabel: 'العلاج المطلوب',
  daysLabel: 'الأيام المتاحة',
  nameLabel: 'الاسم',
  phoneLabel: 'رقم الموبايل',
  notesLabel: 'ملاحظات',

  invalidTitle: 'الرابط مو صحيح',
  invalidBody: 'رابط المتابعة هذا مو شغّال. تأكد إنك ناسخه كامل.',
} as const

/** Student sign-up, login, and the states between signing up and seeing cases. */
export const studentAuth = {
  eyebrow: 'للطلبة',
  accountSection: 'بيانات الحساب',

  /**
   * "Continue with Google". The word Google stays in Latin — it is a product
   * name, and a student reading Arabic still recognises it that way. It sits in
   * an LTR run so the bidi algorithm does not throw it against the punctuation
   * around it.
   */
  google: 'المتابعة بحساب Google',
  googleStarting: 'قيد الفتح…',
  /** Says what the button spares them, which is the reason to press it. */
  googleHint: 'بدون كلمة سر وبدون انتظار إيميل تفعيل.',
  /** Between the Google button and the email fields. */
  or: 'أو',
  /**
   * Shown when Google is the only way in — which is the state سنون is in until
   * a sending domain exists. Says the truth rather than hiding the fields with
   * no explanation.
   */
  passwordSignUpClosed: 'التسجيل بالإيميل وكلمة السر لسه ما مفتوح. سجّل بحساب Google.',
  /** A person's greeting, not a page name — both competitors open this way. */
  welcomeBack: 'أهلاً بيك مرة لخ',
  loginLead: 'حساب واحد يكفي: سجّل، وثّق تسجيلك بالكلية، وشوف الحالات اللي تناسب مرحلتك.',
  signUpTitle: 'حساب جديد للطلبة',
  signUpIntro: 'الحساب للطلبة المرحلة الرابعة والخامسة بطب الأسنان.',
  loginTitle: 'دخول الطلبة',

  nameLabel: 'الاسم الكامل',
  nameHint: 'مثل ما هو بهوية الطالب.',
  emailLabel: 'الإيميل',
  passwordLabel: 'كلمة السر',
  passwordHint: '8 حروف أو أكثر.',

  signUpAction: 'سجّل حساب',
  loginAction: 'دخول',
  signingIn: 'قيد الدخول…',

  haveAccount: 'عندك حساب؟',
  goToLogin: 'ادخل من هنا',
  noAccount: 'ما عندك حساب؟',
  goToSignUp: 'سجّل حساب جديد',
  logout: 'خروج',

  errors: {
    nameRequired: 'اكتب اسمك الكامل.',
    nameTooShort: 'الاسم قصير كلش.',
    emailRequired: 'اكتب إيميلك.',
    emailInvalid: 'الإيميل مو صحيح.',
    passwordRequired: 'اكتب كلمة السر.',
    passwordTooShort: 'كلمة السر لازم 8 حروف أو أكثر.',
    badCredentials: 'الإيميل أو كلمة السر غلط.',
    emailNotVerified: 'فعّل إيميلك أول. شوف الرسالة اللي وصلتك.',
    generic: 'ما كدرنا نكمل. جرّب مرة لخ بعد شوية.',
    signUpClosed: 'تسجيل الطلبة لسه ما مفتوح. راجعنا بعدين.',
    tooMany: 'محاولات كثيرة بوقت قصير. انطر شوية وجرّب مرة لخ.',
    googleUnavailable: 'الدخول بحساب Google مو متوفر هسه.',
  },
} as const

/** Shown instead of the sign-up form while student registration cannot work. */
export const studentSignUpClosed = {
  title: 'تسجيل الطلبة لسه ما مفتوح',
  body: 'تسجيل حسابات الطلبة راح ينفتح قريباً. إذا عندك حساب من قبل، تكدر تدخل بيه.',
} as const

/** Where a student stands between signing up and being able to see cases. */
export const studentStatus = {
  checkEmailTitle: 'فعّل إيميلك',
  checkEmailBody: 'دزّينالك رابط على إيميلك. افتحه حتى تفعّل حسابك.',
  checkEmailSpam: 'إذا ما وصلتك، شوف بمجلد الرسائل غير المرغوب فيها.',
  // Sign-up never says whether an address is already registered, so this is how
  // a student who forgot they had an account finds their way back.
  checkEmailAlready: 'إذا عندك حساب من قبل، ما راح توصلك رسالة جديدة — ادخل بحسابك.',

  profileNeededTitle: 'ناقص معلومات دراستك',
  profileNeededBody: 'لازم تحدد جامعتك وكليتك ومرحلتك حتى نكدر نوثّق حسابك.',
  profileNeededAction: 'كمّل معلوماتك',

  pendingTitle: 'حسابك قيد المراجعة',
  pendingBody:
    'إدارة سنون راح تراجع وثيقة تسجيلك. أول ما تنقبل راح تشوف الحالات المتاحة اللي تناسب مرحلتك.',

  rejectedTitle: 'ما انقبل التوثيق',
  rejectedBody: 'راجع إدارة سنون حتى تعرف السبب وتكدر تعيد المحاولة.',

  suspendedTitle: 'حسابك موقوف',
  suspendedBody: 'تواصل وية إدارة سنون.',

  uploadOnSite: 'ارفعها من الموقع',
  verifiedTitle: 'حسابك موثّق',
  verifiedBody: 'قائمة الحالات المتاحة اللي تناسب مرحلتك لسه قيد البناء.',
} as const

/** The step where a student says where they study and proves it. */
export const studentProfile = {
  eyebrow: 'توثيق الحساب',
  documentSection: 'وثيقة التسجيل',
  studySection: 'وين تدرس',
  daysSection: 'أيام دوامك بالعيادة',
  documentLead: 'صورة واضحة للهوية الجامعية أو وثيقة التسجيل. إدارة سنون بس تشوفها.',
  title: 'معلومات دراستك',
  intro: 'حدد وين تدرس وارفع وثيقة تثبت إنك طالب، وإدارة سنون راح تراجعها.',

  universityLabel: 'الجامعة',
  universityPlaceholder: 'اختر جامعتك',

  collegeLabel: 'الكلية / العيادة',
  collegePlaceholder: 'اختر كليتك',
  collegeHint: 'اختر الجامعة أول.',

  clinicDaysLabel: 'أيام دوامك بالعيادة',
  clinicDaysHint:
    'اختر الأيام اللي تكون بيها بالعيادة. نعرضلك الحالات اللي تناسب أيامك، وإذا حالة أيامها ما تناسبك تكدر تسأل المراجع إذا يكدر يجي بيوم من أيامك.',

  stageLabel: 'المرحلة',
  stagePlaceholder: 'اختر مرحلتك',

  documentLabel: 'وثيقة التسجيل',
  documentHint: 'صورة هوية الطالب أو وثيقة تسجيل. صورة أو PDF، وما تزيد عن 5 ميغا.',
  documentPrivacy: 'الوثيقة تنشاف بس من إدارة سنون، وما تظهر لأي أحد ثاني.',

  submit: 'أرسل للمراجعة',
  submitting: 'قيد الإرسال…',

  notReadyTitle: 'لسه ما نكدر نكمل',
  notReadyBody: 'قوائم الجامعات والكليات لسه ما مضافة. راجعنا بعدين.',

  errors: {
    universityRequired: 'اختر جامعتك.',
    universityUnknown: 'هاي الجامعة مو متوفرة.',
    collegeRequired: 'اختر كليتك.',
    collegeUnknown: 'هاي الكلية مو متوفرة.',
    collegeMismatch: 'الكلية هاي مو تابعة للجامعة اللي اخترتها.',
    stageRequired: 'اختر مرحلتك.',
    stageUnknown: 'هاي المرحلة مو متوفرة.',
    documentRequired: 'ارفع وثيقة التسجيل.',
    clinicDaysRequired: 'اختر يوم واحد على الأقل من أيام دوامك.',
    clinicDaysInvalid: 'في يوم مو صحيح بالاختيار.',
    documentTooBig: 'الملف كبير كلش. لازم أقل من 5 ميغا.',
    documentWrongType: 'نوع الملف مو مقبول. ارفع صورة أو PDF.',
    alreadySubmitted: 'معلوماتك منرسلة من قبل.',
    generic: 'ما كدرنا نرسل المعلومات. جرّب مرة لخ بعد شوية.',
  },
} as const

/** The verified student's queue of available cases, and the case they hold. */
export const studentQueue = {
  eyebrow: 'قائمة الحالات',
  title: 'الحالات المتاحة',
  intro: 'هذي حالات تناسب مرحلتك وعيادتك. أول ما تحجز وحدة تظهرلك معلومات التواصل.',

  /**
   * A result count above the list. Costs nothing, orients immediately, and is
   * the first thing a student looks for when they open the page again.
   *
   * Arabic counts by shape, not by a single plural: one and two have their own
   * forms, three to ten take the broken plural, and eleven upwards goes back to
   * the singular. Getting this wrong is the kind of thing that makes a product
   * read as translated rather than written.
   */
  count: (n: number) =>
    n === 1
      ? 'حالة وحدة'
      : n === 2
        ? 'حالتين'
        : n <= 10
          ? `${n} حالات`
          : `${n} حالة`,

  emptyTitle: 'ما أكو حالات متاحة هسه',
  emptyBody: 'ارجع شوفها بعدين. الحالات الجديدة تظهر هنا أول ما تنقدّم.',
  noScopeTitle: 'ما نكدر نعرض الحالات',
  noScopeBody:
    'ما محددة الحالات اللي تكدر مرحلتك تعالجها بعيادتك. راجع إدارة سنون حتى تضبطها.',

  caseReference: 'رمز الحالة',
  caseTreatments: 'العلاج المطلوب',
  /** Marks a treatment on a case that this student's stage may not perform. */
  otherStageTag: 'مرحلة ثانية',
  otherStageHint:
    'العلاجات المعلّمة بـ «مرحلة ثانية» مو من مرحلتك. تكدر تاخذ الحالة وتسوي اللي يخصك، وبعدين ترجّع الباقي للقائمة لطالب من المرحلة الثانية.',
  caseDays: 'الأيام المتاحة',
  caseNotes: 'ملاحظات المراجع',
  caseSubmitted: 'قُدّمت',

  claim: 'احجز الحالة',

  /**
   * A case whose days do not overlap this student's clinic days. They cannot
   * claim it — they could never schedule it — but they can ask.
   */
  dayMismatchTag: 'أيامك ما تناسب',
  dayMismatchBody:
    'المراجع ما اختار أي يوم من أيام دوامك. تكدر تسأله إذا يكدر يجي بيوم من أيامك، وإذا وافق تنحجز الحالة إلك تلقائياً.',
  dayMismatchOffer: 'راح نسأله عن',
  askDays: 'اسأل المراجع عن أيامك',
  asking: 'قيد الإرسال…',
  askedAlready: 'سألنا المراجع. ننتظر جوابه.',
  askFailedUnavailable: 'هاي الحالة ما عادت متاحة.',
  askFailedNoDays: 'كل أيام دوامك موجودة أصلاً بأيام المراجع — تكدر تحجزها مباشرة.',
  askFailedGeneric: 'ما كدرنا ندز السؤال. جرّب مرة لخ.',

  noClinicDaysTitle: 'ما محددة أيام دوامك',
  noClinicDaysBody:
    'حدد أيام دوامك بالعيادة حتى نعرف أي حالات تناسبك. بدونها راح نعرضلك كل الحالات.',
  noClinicDaysAction: 'حدد أيامك',
  claiming: 'قيد الحجز…',

  claimFailedUnavailable: 'هاي الحالة انحجزت من طالب ثاني. شوف باقي الحالات.',
  claimFailedNotVerified: 'حسابك مو موثّق.',
  claimFailedGeneric: 'ما كدرنا نحجز الحالة. جرّب مرة لخ.',
} as const

/** The case a student is holding right now. */
/**
 * The student's own record.
 *
 * A student is here because their college asks for a number of cases. "How many
 * have I done" is the question they came with, and the site could not answer it.
 */
export const studentHistory = {
  eyebrow: 'سجلّك',
  title: 'حالاتي',
  intro: 'الحالات اللي أخذتها من سنون.',
  link: 'شوف حالاتي',

  treatedLabel: 'حالات علّجتها',
  totalLabel: 'كل الحالات اللي أخذتها',

  emptyTitle: 'لسه ما أخذت ولا حالة',
  emptyBody: 'أول ما تحجز حالة وتخلّصها، تظهر هنا.',

  claimedAt: 'حجزتها',
  closedAt: 'انتهت',
  treatments: 'العلاج',

  outcome: {
    COMPLETED: 'مكتملة',
    ACTIVE: 'شغّالة هسه',
    RELEASED: 'انفكّت',
    EXPIRED: 'انتهت مهلتها',
  },

  /** Shown instead of "مكتملة" when only part of the case was theirs. */
  handedOn: 'خلّصت حصتك ورجّعت الباقي',

  note: 'هذا سجلك بسنون فقط. الحالات اللي تلكاها بنفسك مو محسوبة هنا.',
} as const

export const studentClaim = {
  title: 'الحالة اللي حاجزها',
  intro: 'تواصل وية المراجع واتفق وياه على الموعد.',

  deadlineLabel: 'لازم تتواصل قبل',
  deadlinePassed: 'انتهت المهلة.',
  deadlineHint: 'إذا ما تواصلت بالوقت، الحالة ترجع للقائمة لطالب ثاني.',

  nameLabel: 'اسم المراجع',
  phoneLabel: 'رقم الموبايل',
  callAction: 'اتصل',
  phonePrivacy: 'هذا الرقم ظهرلك لأنك حاجز الحالة. لا تشاركه مع أي أحد.',

  treatmentsLabel: 'العلاج المطلوب',
  daysLabel: 'الأيام المتاحة',
  notesLabel: 'ملاحظات المراجع',

  backToQueue: 'رجوع للحالات',
  notFoundTitle: 'ما لكينا الحالة',
  notFoundBody: 'يمكن انتهت مهلتك وراحت لطالب ثاني.',

  /**
   * The one thing standing between a mistyped number and someone being rung
   * repeatedly about treatment they never asked for. It has to be easy to find
   * and impossible to press by accident.
   */
  wrongNumberTitle: 'الرقم غلط؟',
  wrongNumberBody:
    'إذا اللي رد ما يعرف شي عن الطلب، بلّغنا. الحالة تنغلق ويتوقف الرقم مؤقتاً حتى ما ينرسل نفس الطلب مرة لخ. ما تنحسب عليك.',
  wrongNumberAction: 'بلّغ: صاحب الرقم ما طلب علاج',
  wrongNumberConfirm: 'متأكد؟ الحالة راح تنغلق نهائياً.',
  wrongNumberSaving: 'قيد الإرسال…',
  wrongNumberDone: 'شكراً. انغلقت الحالة وانوقف الرقم.',
  wrongNumberFailed: 'ما كدرنا نسجّل البلاغ. جرّب مرة لخ.',

  /** Shown above the phone number, because the first sentence of the call matters. */
  callAdvice:
    'عرّف بنفسك وبسنون أول شي، وتأكد إن الشخص هو اللي قدّم الطلب قبل ما تحچي عن حالته.',
} as const

/** What the bot says. Plain text — Telegram's markdown parser is not worth the risk. */
export const telegramCopy = {
  welcomePatient: (referenceCode: string) =>
    [
      'أهلاً بيك بسنون.',
      '',
      `تم ربط إشعاراتك بحالتك ${referenceCode}.`,
      'راح نعلمك أول ما يحجز طالب حالتك.',
      '',
      'تكدر توقف الإشعارات بأي وقت بأمر /stop',
    ].join('\n'),

  welcomeStudent: [
    'أهلاً بيك بسنون.',
    '',
    'تم ربط إشعاراتك بحسابك.',
    'راح نعلمك بالمهم — مثل انتهاء مهلة التواصل.',
    '',
    'تكدر توقف الإشعارات بأي وقت بأمر /stop',
  ].join('\n'),

  unknownToken: 'الرابط مو صحيح أو انتهى. ارجع للموقع واطلب رابط جديد.',
  alreadyUsed: 'هذا الرابط مستخدم من قبل. ارجع للموقع واطلب رابط جديد.',
  startWithoutToken: 'أهلاً. حتى تربط الإشعارات، افتح الرابط اللي بالموقع.',
  stopped: 'وقفنا الإشعارات. تكدر ترجع تربطها من الموقع بأي وقت.',
  nothingToStop: 'ما أكو إشعارات مربوطة بهذا الحساب.',
  unknownCommand: 'ما فهمت. الأوامر المتاحة: /start و /stop',

  /** Sent to the patient when a student takes their case. */
  caseClaimed: (referenceCode: string) =>
    [
      `طالب حجز حالتك ${referenceCode}.`,
      'راح يتصل بيك خلال يومين على الرقم اللي كتبته.',
      '',
      'إذا ما اتصل بيك، الحالة ترجع تلقائياً للقائمة لطالب ثاني.',
    ].join('\n'),

  /** Sent to the patient when a claim expires and the case returns to the queue. */
  caseReturned: (referenceCode: string) =>
    [
      `حالتك ${referenceCode} رجعت للقائمة.`,
      'الطالب اللي حجزها ما تواصل وياك بالوقت المحدد، فرجعناها لطالب ثاني.',
    ].join('\n'),

  /** Sent to the patient once a time is agreed. */
  appointmentSet: (referenceCode: string, when: string) =>
    [`تم تحديد موعدك لحالة ${referenceCode}.`, '', when, '', 'إذا ما تكدر تجي، اتصل بالطالب.'].join('\n'),

  /**
   * Sent when one student finished their part and the rest went back to the
   * queue. Without it a patient sees their case "waiting" again and assumes
   * something went wrong.
   */
  remainderQueued: (referenceCode: string) =>
    [
      `خلص جزء من علاجك بحالة ${referenceCode}.`,
      '',
      'باقي العلاج يحتاج طالب من مرحلة ثانية، فرجعنا الحالة للقائمة.',
      'راح نعلمك أول ما ياخذها طالب.',
    ].join('\n'),

  /** Asked when a student's clinic days do not match the days the patient picked. */
  dayRequest: (referenceCode: string, day: string) =>
    [
      `أكو طالب يكدر ياخذ حالتك ${referenceCode}.`,
      '',
      `بس دوامه بالعيادة يوم ${day}، وانت ما اخترت هذا اليوم.`,
      'تكدر تجي بيه؟',
    ].join('\n'),

  /** Sent to the student when the patient agrees to their day. */
  dayRequestAccepted: (referenceCode: string, day: string) =>
    [
      `المراجع وافق يجي يوم ${day}.`,
      '',
      `حالة ${referenceCode} صارت إلك. افتح الموقع حتى تشوف معلومات التواصل وتتصل بيه.`,
    ].join('\n'),

  /** Sent to the student when the patient says no, or somebody else got it. */
  dayRequestDeclined: (referenceCode: string) =>
    `ما وافق المراجع على أيامك بحالة ${referenceCode}. تكدر تشوف باقي الحالات بالموقع.`,

  /** Sent to the student when the patient's tracking link is how they answered. */
  claimExpired: 'انتهت مهلة التواصل وراحت الحالة لطالب ثاني. تكدر تحجز حالة جديدة من الموقع.',
} as const

/** The "turn on notifications" invitation shown on the site. */
export const telegramInvite = {
  title: 'شغّل الإشعارات',
  patientBody: 'اربط تلگرام حتى نعلمك أول ما يحجز طالب حالتك. اختياري.',
  studentBody: 'اربط تلگرام حتى نعلمك بالمهم. اختياري.',
  action: 'اربط تلگرام',
  linked: 'الإشعارات مربوطة.',
  unavailable: 'الإشعارات لسه ما متوفرة.',
} as const

/** The bot asking the patient whether a student actually reached them. */
export const telegramConfirm = {
  ask: (referenceCode: string) =>
    [
      `الطالب اللي حاجز حالتك ${referenceCode} يكول إنه تواصل وياك.`,
      '',
      'صحيح؟',
    ].join('\n'),

  yesButton: 'إي، تواصل وياي',
  noButton: 'لا، ما تواصل أحد',

  thanksYes: 'شكراً. سجّلنا إنه تم التواصل.',
  thanksNo: 'شكراً. إذا ما تواصل وياك بالوقت المحدد، الحالة ترجع تلقائياً لطالب ثاني.',
  alreadyAnswered: 'سجّلنا جوابك من قبل.',
  nothingToConfirm: 'ما أكو حالة تنتظر تأكيدك.',
} as const

/** The same confirmation on the patient's tracking page, for anyone not on Telegram. */
export const patientConfirm = {
  title: 'تواصل وياك طالب؟',
  body: 'الطالب اللي حاجز حالتك يكول إنه تواصل وياك. أكّدلنا حتى نكمل.',
  yes: 'إي، تواصل وياي',
  no: 'لا، ما تواصل أحد',
  confirmed: 'شكراً، سجّلنا إنه تم التواصل.',
  denied: 'شكراً. إذا ما تواصل وياك بالوقت المحدد، الحالة ترجع لطالب ثاني.',
} as const

/** What the student sees on the case they are holding. */
export const studentContact = {
  assertTitle: 'تواصلت وية المراجع؟',
  assertBody: 'إذا اتصلت بيه، خبّرنا وراح نسأل المراجع يأكد.',
  assertAction: 'تواصلت وياه',
  assertPending: 'دزّينا للمراجع يأكد. ننتظر جوابه.',
  assertConfirmed: 'المراجع أكّد التواصل.',
  assertFailed: 'ما كدرنا نسجّل. جرّب مرة لخ.',
} as const

/** The steps a student works through after contact is confirmed. */
export const studentLifecycle = {
  appointmentTitle: 'حدد الموعد',
  appointmentBody: 'بعد ما تتفق وية المراجع، حدد الموعد هنا.',
  appointmentLabel: 'تاريخ ووقت الموعد',
  appointmentHint: 'بتوقيت بغداد.',
  appointmentAction: 'ثبّت الموعد',
  appointmentSaving: 'قيد التثبيت…',

  appointmentSetTitle: 'الموعد مثبّت',
  rescheduleAction: 'غيّر الموعد',

  /**
   * Handing the rest of a case to another stage.
   *
   * The two years do not treat the same things, so a case wanting a root canal
   * and a partial denture needs both a fifth year and a fourth. This is how the
   * one who holds it passes on the part they may not do.
   */
  remainderTitle: 'باقي علاجات مو من مرحلتك',
  remainderBody: 'إذا خلصت اللي يخص مرحلتك، رجّع الباقي للقائمة حتى ياخذه طالب من مرحلة ثانية.',
  remainderListLabel: 'اللي راح يرجع للقائمة',
  remainderAction: 'خلصت حصتي — رجّع الباقي',
  remainderSaving: 'قيد الإرسال…',
  remainderDone: 'رجّعنا الباقي للقائمة. شكراً.',

  outcomeTitle: 'شنو صار بالموعد؟',
  outcomeBody: 'سجّل النتيجة حتى تنغلق الحالة.',
  completed: 'تم العلاج',
  noShow: 'المراجع ما حضر',
  cancelled: 'انلغى الموعد',
  outcomeSaving: 'قيد التسجيل…',

  closedTitle: 'الحالة منغلقة',
  handedOnTitle: 'خلصت حصتك من الحالة',
  closedCompleted: 'تم العلاج. شكراً.',
  /** Shown to the student who did their half of a shared case. */
  closedHandedOn: 'خلصت اللي يخص مرحلتك. باقي العلاج رجع للقائمة لطالب من مرحلة ثانية.',
  closedNoShow: 'المراجع ما حضر الموعد.',
  closedCancelled: 'انلغى الموعد.',

  errors: {
    inPast: 'الموعد لازم يكون بالمستقبل.',
    invalidDate: 'التاريخ مو صحيح.',
    wrongStatus: 'ما نكدر نسوي هاي الخطوة هسه.',
    generic: 'ما كدرنا نسجّل. جرّب مرة لخ.',
  },
} as const

/** What the patient sees about their appointment. */
export const patientAppointment = {
  label: 'موعدك',
  hint: 'بتوقيت بغداد. إذا ما تكدر تجي، اتصل بالطالب.',
} as const

/** What the bot says to a student sending their enrolment document. */
export const telegramStudentDoc = {
  prompt: [
    'دزّلي صورة هوية الطالب أو وثيقة التسجيل.',
    '',
    'تكدر تصوّرها بالموبايل ودزّها هنا مباشرة.',
  ].join('\n'),

  received: [
    'وصلتنا وثيقتك.',
    '',
    'إدارة سنون راح تراجعها، وراح نعلمك أول ما ينطلع القرار.',
  ].join('\n'),

  alreadyVerified: 'حسابك موثّق من قبل. ما تحتاج تدز وثيقة.',
  suspended: 'حسابك موقوف. تواصل وية إدارة سنون.',
  tooLarge: 'الملف كبير كلش. لازم أقل من 5 ميغا.',
  wrongType: 'نوع الملف مو مقبول. دزّ صورة أو PDF.',
  failed: 'ما كدرنا نستلم الوثيقة. جرّب مرة لخ.',
  notAStudent: 'هذا الحساب مربوط بحالة مراجع، مو بحساب طالب.',

  /** Sent when an admin decides. */
  verified: 'انقبل توثيقك. تكدر هسه تشوف الحالات المتاحة بالموقع.',
  rejected: 'ما انقبلت وثيقتك. تكدر تدز وحدة أوضح، أو تراجع إدارة سنون.',
} as const

/** Offering the bot to a student. */
export const studentTelegram = {
  title: 'شغّل الإشعارات',
  body: 'اربط تلگرام حتى نعلمك بالمهم — مثل قرار التوثيق ومهلة التواصل. اختياري.',

  sendDocTitle: 'دزّ وثيقتك بتلگرام',
  sendDocBody:
    'أسهل طريقة: افتح البوت وصوّر هوية الطالب ودزّها. أو ارفعها من الموقع إذا تفضّل.',

  action: 'اربط تلگرام',
  open: 'افتح البوت',
  linked: 'تلگرام مربوط.',
  unavailable: 'الإشعارات لسه ما متوفرة.',

  documentMissingTitle: 'ناقصة وثيقة التسجيل',
  documentMissingBody: 'ما نكدر نوثّق حسابك بدون وثيقة تثبت إنك طالب.',
} as const

/** Intraoral photographs on the case form. */
export const casePhotos = {
  label: 'صور الأسنان (اختياري)',
  hint: 'صور داخل الفم تساعد الطالب يفهم حالتك قبل ما يحجزها. تكدر ترفع لحد 4 صور.',

  /** The guide requires this warning, in Arabic, on the upload itself. */
  faceWarning: 'لا تصوّر وجهك. صوّر الأسنان بس.',
  privacy: 'الصور تنشاف بس من طلبة طب الأسنان الموثّقين ومن إدارة سنون. ما تنشر بأي مكان.',

  errors: {
    tooMany: 'أكثر من اللازم. 4 صور بالأكثر.',
    tooLarge: 'وحدة من الصور كبيرة كلش. أكبر حجم للصورة 12 ميغا.',
    notAnImage: 'وحدة من الملفات مو صورة.',
    /** Shown by the browser before uploading, so a doomed upload never starts. */
    tooLargeTotal: 'مجموع حجم الصور كبير كلش. اختر صور أقل أو أصغر.',
  },

  /** The native file input renders an English, left-to-right control that no
   *  amount of CSS can translate. These label a styled one instead. */
  choose: 'اختر صور',
  chooseMore: 'اختر صور ثانية',
  chosen: (count: number) => `اخترت ${count} صور`,
  chosenOne: 'اخترت صورة وحدة',

  patientLabel: 'صورك',
  studentLabel: 'صور الحالة',
} as const
