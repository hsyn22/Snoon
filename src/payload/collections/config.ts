import type { CollectionConfig } from 'payload'
import { revalidateOnChange, revalidateOnDelete } from '@/payload/hooks/revalidate'

/** Applied to collections the public pages render, so an admin edit shows at once. */
const revalidateHooks = {
  afterChange: [revalidateOnChange],
  afterDelete: [revalidateOnDelete],
}

/**
 * Payload-managed configuration.
 *
 * These are the things an administrator must be able to change without a
 * deployment: which cities سنون operates in, which universities and clinics
 * exist, what treatments are offered, and — the important one — which treatments
 * each stage may perform at each clinic, because that decides what a student can
 * see.
 *
 * Every collection carries a `slug` text field. That, not Payload's numeric id,
 * is what a case or student row stores, because it is stable, readable in the
 * database, and survives the config being re-seeded. Changing a slug after cases
 * reference it would orphan them, so the field is marked accordingly.
 */

/** Shared: the stable key other tables join on. */
const slugField = {
  name: 'slug',
  type: 'text' as const,
  required: true,
  unique: true,
  index: true,
  admin: {
    description:
      'المعرّف الثابت (بالإنكليزي، بدون مسافات). لا تغيّره بعد ما تنربط بيه حالات — راح تنفصل عنه.',
  },
}

const nameArField = {
  name: 'nameAr',
  type: 'text' as const,
  required: true,
  label: 'الاسم بالعربي',
}

const activeField = {
  name: 'active',
  type: 'checkbox' as const,
  defaultValue: true,
  label: 'مفعّل',
  admin: { description: 'إذا مطفي، ما يظهر بالخيارات الجديدة — بس الحالات القديمة تبقى.' },
}

export const Cities: CollectionConfig = {
  slug: 'cities',
  labels: { singular: 'مدينة', plural: 'المدن' },
  admin: { useAsTitle: 'nameAr', defaultColumns: ['nameAr', 'slug', 'active'], group: 'الإعدادات' },
  access: { read: () => true },
  hooks: revalidateHooks,
  fields: [nameArField, slugField, activeField],
}

export const Universities: CollectionConfig = {
  slug: 'universities',
  labels: { singular: 'جامعة', plural: 'الجامعات' },
  admin: { useAsTitle: 'nameAr', defaultColumns: ['nameAr', 'city', 'active'], group: 'الإعدادات' },
  access: { read: () => true },
  fields: [
    nameArField,
    slugField,
    { name: 'city', type: 'relationship', relationTo: 'cities', required: true, label: 'المدينة' },
    activeField,
  ],
}

export const Colleges: CollectionConfig = {
  slug: 'colleges',
  labels: { singular: 'كلية / عيادة', plural: 'الكليات والعيادات' },
  admin: {
    useAsTitle: 'nameAr',
    defaultColumns: ['nameAr', 'university', 'active'],
    group: 'الإعدادات',
  },
  access: { read: () => true },
  fields: [
    nameArField,
    slugField,
    {
      name: 'university',
      type: 'relationship',
      relationTo: 'universities',
      required: true,
      label: 'الجامعة',
    },
    activeField,
  ],
}

export const Stages: CollectionConfig = {
  slug: 'stages',
  labels: { singular: 'مرحلة', plural: 'المراحل الدراسية' },
  admin: { useAsTitle: 'nameAr', defaultColumns: ['nameAr', 'order', 'active'], group: 'الإعدادات' },
  access: { read: () => true },
  hooks: revalidateHooks,
  fields: [
    nameArField,
    slugField,
    { name: 'order', type: 'number', required: true, defaultValue: 1, label: 'الترتيب' },
    {
      name: 'defaultTreatmentTypes',
      type: 'relationship',
      relationTo: 'treatment-types',
      hasMany: true,
      label: 'العلاجات الافتراضية لهذي المرحلة',
      admin: {
        description:
          'شنو تكدر تعالج هذي المرحلة بشكل عام. تنطبق على أي عيادة ما محدد إلها صلاحيات خاصة. بدون هذا، إضافة عيادة جديدة تخلي كل الحالات مخفية عن طلابها لحد ما أحد يملي الجدول.',
      },
    },
    activeField,
  ],
}

export const TreatmentTypes: CollectionConfig = {
  slug: 'treatment-types',
  labels: { singular: 'نوع علاج', plural: 'أنواع العلاج' },
  admin: { useAsTitle: 'nameAr', defaultColumns: ['nameAr', 'order', 'active'], group: 'الإعدادات' },
  access: { read: () => true },
  hooks: revalidateHooks,
  fields: [
    nameArField,
    slugField,
    { name: 'order', type: 'number', required: true, defaultValue: 1, label: 'الترتيب' },
    activeField,
  ],
}

/**
 * What each stage may treat at each clinic.
 *
 * This decides what a student SEES, not merely what they may do — a missing or
 * wrong row makes cases invisible to the students who could take them, which
 * looks like "nobody is claiming cases" rather than like a misconfiguration.
 * Worth auditing against cases that sit unclaimed.
 */
export const StageCapabilities: CollectionConfig = {
  slug: 'stage-capabilities',
  labels: { singular: 'صلاحية مرحلة', plural: 'صلاحيات المراحل' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['college', 'stage', 'treatmentTypes'],
    group: 'الإعدادات',
    description: 'شنو تكدر تعالج كل مرحلة بكل عيادة. هذا يحدد شنو يشوف الطالب.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        // A readable title in listings, since the row is really a pair of relations.
        beforeChange: [({ siblingData }) => `${siblingData.college ?? '—'} / ${siblingData.stage ?? '—'}`],
      },
    },
    {
      name: 'college',
      type: 'relationship',
      relationTo: 'colleges',
      required: true,
      label: 'الكلية / العيادة',
    },
    { name: 'stage', type: 'relationship', relationTo: 'stages', required: true, label: 'المرحلة' },
    {
      name: 'treatmentTypes',
      type: 'relationship',
      relationTo: 'treatment-types',
      hasMany: true,
      required: true,
      label: 'أنواع العلاج المسموحة',
    },
  ],
}
