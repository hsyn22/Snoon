/**
 * ⚠️ TEMPORARY STAND-IN FOR PAYLOAD-MANAGED CONFIGURATION ⚠️
 *
 * Cities and treatment types belong to Payload — an administrator must be able
 * to add a city or retire a treatment type without a deployment. Payload is not
 * installed yet, so this module hardcodes the same data behind the same async
 * interface a Payload Local API call will have.
 *
 * When Payload lands, the bodies of these functions are replaced with
 * `payload.find(...)` calls and nothing that imports them changes. The IDs below
 * become the Payload document IDs, so they must stay stable — a case row stores
 * `cityId` and `treatmentTypeId` as plain text, and repointing them later would
 * mean migrating live cases.
 */

export type City = {
  id: string
  nameAr: string
}

export type TreatmentType = {
  id: string
  nameAr: string
}

const CITIES: readonly City[] = [
  { id: 'baghdad', nameAr: 'بغداد' },
  { id: 'basra', nameAr: 'البصرة' },
  { id: 'mosul', nameAr: 'الموصل' },
  { id: 'erbil', nameAr: 'أربيل' },
  { id: 'najaf', nameAr: 'النجف' },
  { id: 'karbala', nameAr: 'كربلاء' },
  { id: 'sulaymaniyah', nameAr: 'السليمانية' },
  { id: 'kirkuk', nameAr: 'كركوك' },
  { id: 'diwaniyah', nameAr: 'الديوانية' },
  { id: 'hillah', nameAr: 'الحلة' },
  { id: 'nasiriyah', nameAr: 'الناصرية' },
  { id: 'amarah', nameAr: 'العمارة' },
  { id: 'ramadi', nameAr: 'الرمادي' },
  { id: 'baquba', nameAr: 'بعقوبة' },
  { id: 'samawah', nameAr: 'السماوة' },
  { id: 'kut', nameAr: 'الكوت' },
  { id: 'duhok', nameAr: 'دهوك' },
  { id: 'tikrit', nameAr: 'تكريت' },
] as const

const TREATMENT_TYPES: readonly TreatmentType[] = [
  { id: 'examination', nameAr: 'فحص' },
  { id: 'filling', nameAr: 'حشوة' },
  { id: 'extraction', nameAr: 'قلع' },
  { id: 'scaling', nameAr: 'تنظيف' },
  { id: 'root-canal', nameAr: 'علاج عصب' },
  { id: 'partial-denture', nameAr: 'طقم جزئي' },
  { id: 'complete-denture', nameAr: 'طقم كامل' },
  { id: 'orthodontics', nameAr: 'تقويم أسنان' },
  { id: 'paediatric', nameAr: 'أسنان الأطفال' },
] as const

export async function getCities(): Promise<readonly City[]> {
  return CITIES
}

export async function getTreatmentTypes(): Promise<readonly TreatmentType[]> {
  return TREATMENT_TYPES
}

/** Whether an ID submitted by a form is one we actually offer. */
export async function isKnownCityId(id: string): Promise<boolean> {
  return CITIES.some((city) => city.id === id)
}

export async function isKnownTreatmentTypeId(id: string): Promise<boolean> {
  return TREATMENT_TYPES.some((treatment) => treatment.id === id)
}

export async function getCityById(id: string): Promise<City | undefined> {
  return CITIES.find((city) => city.id === id)
}

export async function getTreatmentTypeById(id: string): Promise<TreatmentType | undefined> {
  return TREATMENT_TYPES.find((treatment) => treatment.id === id)
}

/**
 * How long a student has to contact the patient after claiming a case.
 *
 * 48 hours, not 24: students are in clinic during the day and patients may not
 * answer first try. This becomes a Payload setting so it can be tuned from the
 * admin without a deployment — it is emphatically not a constant.
 */
export async function getContactWindowHours(): Promise<number> {
  return 48
}

/**
 * Clinic days, starting Saturday as Iraqi clinics do. Friday is always a
 * holiday, so it is not offered — a patient cannot pick a day no clinic runs.
 */
export const WEEK_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value)
}
