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
