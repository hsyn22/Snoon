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
  ],
}
