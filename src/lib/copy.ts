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
