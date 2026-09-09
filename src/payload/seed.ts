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

/**
 * Which treatments each stage may perform.
 *
 * From Haider, who is a dentist — not a guess. Most work is shared between the
 * two years; the exceptions run both ways, which is the whole reason a case can
 * need two students:
 *
 *   fifth year only   root canal, complete denture, orthodontics, paediatrics
 *   fourth year only  partial denture
 *   both              examination, filling, extraction, scaling
 *
 * A patient wanting a partial denture and a root canal therefore needs a fourth
 * year AND a fifth year. One claims it, does their part, and hands the rest back
 * to the queue — see `returnRemainderToQueue`.
 *
 * Seeded as the stage's default rather than per clinic, so adding a college does
 * not hide every case from its students until someone fills in a matrix. A
 * clinic that genuinely differs gets its own row in stage-capabilities.
 */
const SHARED_TREATMENTS = ['examination', 'filling', 'extraction', 'scaling']

const STAGES = [
  {
    slug: 'stage-4',
    nameAr: 'المرحلة الرابعة',
    treatments: [...SHARED_TREATMENTS, 'partial-denture'],
  },
  {
    slug: 'stage-5',
    nameAr: 'المرحلة الخامسة',
    treatments: [
      ...SHARED_TREATMENTS,
      'root-canal',
      'complete-denture',
      'orthodontics',
      'paediatric',
    ],
  },
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

  /**
   * Fill in a stage's default treatments, but only if nobody has set them.
   *
   * Re-seeding must not overwrite an administrator's decision — the whole point
   * of this config living in Payload is that it can be corrected without a
   * deployment, and a seed that stomps corrections makes that a lie.
   */
  async function ensureStageDefaults(stageSlug: string, treatmentSlugs: string[]) {
    const found = await payload.find({
      collection: 'stages',
      where: { slug: { equals: stageSlug } },
      limit: 1,
      pagination: false,
    })

    const stage = found.docs[0]
    if (!stage) return

    const current = stage.defaultTreatmentTypes
    if (Array.isArray(current) && current.length > 0) return

    const treatments = await payload.find({
      collection: 'treatment-types',
      where: { slug: { in: treatmentSlugs } },
      limit: 100,
      pagination: false,
    })

    if (treatments.docs.length === 0) return

    await payload.update({
      collection: 'stages',
      id: stage.id,
      data: { defaultTreatmentTypes: treatments.docs.map((doc) => doc.id) },
    })
  }

  for (const city of CITIES) await ensure('cities', city)
  for (const [index, treatment] of TREATMENT_TYPES.entries()) {
    await ensure('treatment-types', { ...treatment, order: index + 1 })
  }
  for (const [index, stage] of STAGES.entries()) {
    const { treatments, ...fields } = stage
    await ensure('stages', { ...fields, order: index + 4 })
    await ensureStageDefaults(stage.slug, treatments)
  }

  return { created, existing }
}
