import type { GlobalConfig } from 'payload'

/**
 * Platform settings an administrator can change without a deployment.
 */
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'الإعدادات العامة',
  admin: { group: 'الإدارة' },
  access: { read: () => true },
  fields: [
    {
      name: 'contactWindowHours',
      type: 'number',
      required: true,
      defaultValue: 48,
      min: 1,
      max: 336,
      label: 'مهلة التواصل (بالساعات)',
      admin: {
        description:
          'كم ساعة عند الطالب حتى يتواصل وية المريض بعد ما ياخذ الحالة. إذا انتهت المهلة، الحالة ترجع للقائمة لطالب ثاني. الافتراضي 48 ساعة — الطلبة بالعيادة أثناء النهار والمريض ممكن ما يرد أول مرة.',
      },
    },
    {
      name: 'caseExpiryDays',
      type: 'number',
      required: true,
      defaultValue: 30,
      min: 1,
      max: 365,
      label: 'مدة صلاحية الحالة (بالأيام)',
      admin: {
        description:
          'إذا مرت هذي المدة وما حجز أي طالب الحالة، تنتهي صلاحيتها وتنشال من القائمة. المريض غالباً يكون لكه علاج بمكان ثاني، وما نريد طالب يتصل بيه بعد شهور.',
      },
    },
    {
      name: 'contactGraceHours',
      type: 'number',
      required: true,
      defaultValue: 48,
      min: 1,
      max: 336,
      label: 'مهلة إضافية بعد ما الطالب يكَول إنه اتصل (بالساعات)',
      admin: {
        description:
          'لما الطالب يبلّغ إنه اتصل بالمريض، نمدد مهلته هذي المدة حتى ننطي المريض وقت يأكد. مريض ما يستعمل تلگرام وما يفتح الرابط ممكن ياخذ يومين لحد ما يرد. الافتراضي 48 ساعة.',
      },
    },
    {
      name: 'wrongNumberBlockDays',
      type: 'number',
      required: true,
      defaultValue: 30,
      min: 1,
      max: 365,
      label: 'مدة إيقاف الرقم بعد بلاغ رقم غلط (بالأيام)',
      admin: {
        description:
          'إذا طالب بلّغ إن صاحب الرقم ما طلب علاج، الرقم ما يكدر يقدّم حالة جديدة هذي المدة. هذا يمنع نفس الشخص من إعادة إرسال نفس الطلب على رقم شخص ما يعرف. تكدر تشيل الإيقاف من صفحة الحالات.',
      },
    },
    {
      name: 'maxOpenCasesPerPhone',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 1,
      max: 20,
      label: 'أكثر عدد حالات مفتوحة لنفس الرقم',
      admin: {
        description:
          'أكثر من واحد بنفس البيت ممكن يستعملون نفس الرقم، فما نخليها وحدة — بس نمنع إن أحد يرسل عشرات الطلبات على رقم شخص ثاني.',
      },
    },
    {
      name: 'maxCasesPerPhonePerDay',
      type: 'number',
      required: true,
      defaultValue: 5,
      min: 1,
      max: 50,
      label: 'أكثر عدد حالات لنفس الرقم بـ 24 ساعة',
      admin: { description: 'حد إضافي على السرعة، مو بس على العدد المفتوح.' },
    },
    {
      name: 'contactRetentionDays',
      type: 'number',
      required: true,
      defaultValue: 90,
      min: 7,
      max: 3650,
      label: 'مدة الاحتفاظ بمعلومات التواصل بعد انتهاء الحالة (بالأيام)',
      admin: {
        description:
          'بعد هذي المدة، اسم المريض ورقمه وملاحظاته تنمحى نهائياً من الحالة. الحالة نفسها تبقى — رمزها وسجلها ونوع العلاج — حتى تكدر تجاوب إذا أحد سأل عن حالة قديمة. رقم الموبايل هو أخطر شي بالنظام، وحالة خالصة ما تحتاجه.',
      },
    },
    {
      name: 'photoRetentionDays',
      type: 'number',
      required: true,
      defaultValue: 60,
      min: 1,
      max: 730,
      label: 'مدة الاحتفاظ بالصور بعد انتهاء الحالة (بالأيام)',
      admin: {
        description:
          'بعد ما تنغلق الحالة، الصور تنحذف نهائياً بعد هذي المدة. ما نحتفظ بصور داخل فم المريض أكثر من اللازم.',
      },
    },
  ],
}
