import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Seed the configuration Payload now owns.
 *
 * Idempotent: matched on `slug`, so running it twice changes nothing and running
 * it after an admin has edited a name leaves that edit alone. It exists so the
 * patient form does not go blank the moment configuration moves out of code, and
 * so a fresh database is usable immediately.
 *
 * Deliberately does NOT seed universities, colleges or stage capabilities. Which
 * universities have dental colleges, where they are, and what each stage may
 * treat are facts about Iraq that must come from Haider — inventing them would
 * put wrong data somewhere it is hard to notice and quietly harmful, because a
 * wrong capability mapping hides cases rather than showing an error.
 */

const CITIES = [
  { slug: 'baghdad', nameAr: 'بغداد' },
  { slug: 'basra', nameAr: 'البصرة' },
  { slug: 'mosul', nameAr: 'الموصل' },
  { slug: 'erbil', nameAr: 'أربيل' },
  { slug: 'najaf', nameAr: 'النجف' },
  { slug: 'karbala', nameAr: 'كربلاء' },
  { slug: 'sulaymaniyah', nameAr: 'السليمانية' },
  { slug: 'kirkuk', nameAr: 'كركوك' },
  { slug: 'diwaniyah', nameAr: 'الديوانية' },
  { slug: 'hillah', nameAr: 'الحلة' },
  { slug: 'nasiriyah', nameAr: 'الناصرية' },
  { slug: 'amarah', nameAr: 'العمارة' },
  { slug: 'ramadi', nameAr: 'الرمادي' },
  { slug: 'baquba', nameAr: 'بعقوبة' },
  { slug: 'samawah', nameAr: 'السماوة' },
  { slug: 'kut', nameAr: 'الكوت' },
  { slug: 'duhok', nameAr: 'دهوك' },
  { slug: 'tikrit', nameAr: 'تكريت' },
]

const TREATMENT_TYPES = [
  { slug: 'examination', nameAr: 'فحص' },
  { slug: 'filling', nameAr: 'حشوة' },
  { slug: 'extraction', nameAr: 'قلع' },
  { slug: 'scaling', nameAr: 'تنظيف' },
  { slug: 'root-canal', nameAr: 'علاج عصب' },
  { slug: 'partial-denture', nameAr: 'طقم جزئي' },
  { slug: 'complete-denture', nameAr: 'طقم كامل' },
  { slug: 'orthodontics', nameAr: 'تقويم أسنان' },
  { slug: 'paediatric', nameAr: 'أسنان الأطفال' },
]

const STAGES = [
  { slug: 'stage-4', nameAr: 'المرحلة الرابعة' },
  { slug: 'stage-5', nameAr: 'المرحلة الخامسة' },
]

export async function seed(): Promise<{ created: number; existing: number }> {
  const payload = await getPayload({ config })
  let created = 0
  let existing = 0

  async function ensure(
    collection: 'cities' | 'treatment-types' | 'stages',
    data: Record<string, unknown> & { slug: string },
  ) {
    const found = await payload.find({
      collection,
      where: { slug: { equals: data.slug } },
      limit: 1,
      pagination: false,
    })
    if (found.docs.length > 0) {
      existing += 1
      return
    }
    await payload.create({ collection, data: data as never })
    created += 1
  }

  for (const city of CITIES) await ensure('cities', city)
  for (const [index, treatment] of TREATMENT_TYPES.entries()) {
    await ensure('treatment-types', { ...treatment, order: index + 1 })
  }
  for (const [index, stage] of STAGES.entries()) {
    await ensure('stages', { ...stage, order: index + 4 })
  }

  return { created, existing }
}
