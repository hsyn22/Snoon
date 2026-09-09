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
          'كم ساعة عند الطالب حتى يتواصل وية المريض بعد ما ياخذ الحالة. إذا انتهت المهلة، الحالة ترجع للقائمة لطالب ثاني. الافتراضي ٤٨ ساعة — الطلبة بالعيادة أثناء النهار والمريض ممكن ما يرد أول مرة.',
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
