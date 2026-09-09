/**
 * All user-facing Arabic copy lives here.
 *
 * Copy is data, not final. Nothing user-facing should be a string literal in a
 * component — when the wording changes (and it will), it changes in this file
 * only. No interpolation of patient names or phone numbers into copy, ever.
 */

export const site = {
  name: 'سنون',
  nameLatin: 'SNOON',
  tagline: 'نربط المرضى بطلبة طب الأسنان',
  description:
    'العلاج يكون في عيادة الجامعة وتحت إشراف الأساتذة. سنون يوصّل بس — ما يقدّم علاج وما يوظّف أحد.',
} as const

export const nav = {
  home: 'الرئيسية',
  forPatients: 'للمرضى',
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
    body: 'مواد وأدوات للطلبة والأطباء، ومنتجات العناية بالفم للمرضى.',
    action: 'قريباً',
    note: 'لسه ما متوفر.',
  },
} as const

export const howItWorks = {
  title: 'شلون يشتغل',
  steps: [
    'المريض يقدّم حالته: المدينة، نوع العلاج المطلوب، والأوقات اللي يكدر يجي بيها.',
    'الطالب الموثّق يشوف الحالات اللي تناسب مرحلته وعيادته، ويحجز وحدة منها.',
    'بعد الحجز بس، تظهر للطالب معلومات التواصل، ويتواصل وية المريض ويحدد الموعد.',
    'العلاج يصير بعيادة الجامعة وتحت إشراف الأساتذة.',
  ],
} as const

export const footer = {
  disclaimer:
    'سنون منصة توصيل بين المرضى وطلبة طب الأسنان. العلاج يقدّمه الطالب داخل عيادة الجامعة وتحت إشراف جامعي. سنون ما يقدّم خدمة طبية وما يتحمل مسؤولية العلاج.',
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
} as const

/** The patient case-submission form. */
export const caseForm = {
  title: 'قدّم حالتك',
  intro: 'املأ المعلومات وراح نوصلها لطلبة طب الأسنان بمدينتك. ما تحتاج حساب.',

  cityLabel: 'المدينة',
  cityPlaceholder: 'اختر مدينتك',

  treatmentLabel: 'شنو العلاج اللي تحتاجه؟',
  treatmentHint: 'تكدر تختار أكثر من وحدة. إذا مو متأكد، اختر الأقرب لحالتك والطالب راح يشخّص.',

  daysLabel: 'أي أيام تكدر تجي؟',
  daysHint: 'اختر كل الأيام اللي تناسبك — كل ما تختار أكثر، تلكى طالب أسرع.',

  nameLabel: 'الاسم',
  nameHint: 'الاسم اللي يناديك بيه الطالب.',

  phoneLabel: 'رقم الموبايل',
  phoneHint: 'يظهر بس للطالب اللي ياخذ حالتك، وما يظهر لأي أحد غيره.',

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
  },
} as const

/** The page shown after a case is submitted, and the patient's tracking page. */
export const caseTracking = {
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
  signUpTitle: 'حساب جديد للطلبة',
  signUpIntro: 'الحساب للطلبة المرحلة الرابعة والخامسة بطب الأسنان.',
  loginTitle: 'دخول الطلبة',

  nameLabel: 'الاسم الكامل',
  nameHint: 'مثل ما هو بهوية الطالب.',
  emailLabel: 'الإيميل',
  passwordLabel: 'كلمة السر',
  passwordHint: '٨ حروف أو أكثر.',

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
    passwordTooShort: 'كلمة السر لازم ٨ حروف أو أكثر.',
    badCredentials: 'الإيميل أو كلمة السر غلط.',
    emailNotVerified: 'فعّل إيميلك أول. شوف الرسالة اللي وصلتك.',
    generic: 'ما كدرنا نكمل. جرّب مرة لخ بعد شوية.',
    signUpClosed: 'تسجيل الطلبة لسه ما مفتوح. راجعنا بعدين.',
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

  verifiedTitle: 'حسابك موثّق',
  verifiedBody: 'قائمة الحالات المتاحة اللي تناسب مرحلتك لسه قيد البناء.',
} as const

/** The step where a student says where they study and proves it. */
export const studentProfile = {
  title: 'معلومات دراستك',
  intro: 'حدد وين تدرس وارفع وثيقة تثبت إنك طالب، وإدارة سنون راح تراجعها.',

  universityLabel: 'الجامعة',
  universityPlaceholder: 'اختر جامعتك',

  collegeLabel: 'الكلية / العيادة',
  collegePlaceholder: 'اختر كليتك',
  collegeHint: 'اختر الجامعة أول.',

  stageLabel: 'المرحلة',
  stagePlaceholder: 'اختر مرحلتك',

  documentLabel: 'وثيقة التسجيل',
  documentHint: 'صورة هوية الطالب أو وثيقة تسجيل. صورة أو PDF، وما تزيد عن ٥ ميكا.',
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
    documentTooBig: 'الملف كبير كلش. لازم أقل من ٥ ميكا.',
    documentWrongType: 'نوع الملف مو مقبول. ارفع صورة أو PDF.',
    alreadySubmitted: 'معلوماتك منرسلة من قبل.',
    generic: 'ما كدرنا نرسل المعلومات. جرّب مرة لخ بعد شوية.',
  },
} as const

/** The verified student's queue of available cases, and the case they hold. */
export const studentQueue = {
  title: 'الحالات المتاحة',
  intro: 'هذي حالات تناسب مرحلتك وعيادتك. أول ما تحجز وحدة تظهرلك معلومات التواصل.',

  emptyTitle: 'ما أكو حالات متاحة هسه',
  emptyBody: 'ارجع شوفها بعدين. الحالات الجديدة تظهر هنا أول ما تنقدّم.',
  noScopeTitle: 'ما نكدر نعرض الحالات',
  noScopeBody:
    'ما محددة الحالات اللي تكدر مرحلتك تعالجها بعيادتك. راجع إدارة سنون حتى تضبطها.',

  caseReference: 'رمز الحالة',
  caseTreatments: 'العلاج المطلوب',
  caseDays: 'الأيام المتاحة',
  caseNotes: 'ملاحظات المريض',
  caseSubmitted: 'قُدّمت',

  claim: 'احجز الحالة',
  claiming: 'قيد الحجز…',

  claimFailedUnavailable: 'هاي الحالة انحجزت من طالب ثاني. شوف باقي الحالات.',
  claimFailedNotVerified: 'حسابك مو موثّق.',
  claimFailedGeneric: 'ما كدرنا نحجز الحالة. جرّب مرة لخ.',
} as const

/** The case a student is holding right now. */
export const studentClaim = {
  title: 'الحالة اللي حاجزها',
  intro: 'تواصل وية المريض واتفق وياه على الموعد.',

  deadlineLabel: 'لازم تتواصل قبل',
  deadlinePassed: 'انتهت المهلة.',
  deadlineHint: 'إذا ما تواصلت بالوقت، الحالة ترجع للقائمة لطالب ثاني.',

  nameLabel: 'اسم المريض',
  phoneLabel: 'رقم الموبايل',
  callAction: 'اتصل',
  phonePrivacy: 'هذا الرقم ظهرلك لأنك حاجز الحالة. لا تشاركه مع أي أحد.',

  treatmentsLabel: 'العلاج المطلوب',
  daysLabel: 'الأيام المتاحة',
  notesLabel: 'ملاحظات المريض',

  backToQueue: 'رجوع للحالات',
  notFoundTitle: 'ما لكينا الحالة',
  notFoundBody: 'يمكن انتهت مهلتك وراحت لطالب ثاني.',
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

  /** Sent to the student when their contact window runs out. */
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
  assertTitle: 'تواصلت وية المريض؟',
  assertBody: 'إذا اتصلت بيه، خبّرنا وراح نسأل المريض يأكد.',
  assertAction: 'تواصلت وياه',
  assertPending: 'دزّينا للمريض يأكد. ننتظر جوابه.',
  assertConfirmed: 'المريض أكّد التواصل.',
  assertFailed: 'ما كدرنا نسجّل. جرّب مرة لخ.',
} as const
