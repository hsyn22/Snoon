// Guarantees a build-time error rather than a mysterious bundling failure if a
// Client Component ever imports this module.
import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { City, College, Stage, TreatmentType, University } from './schema'

/**
 * Configuration, read from Payload.
 *
 * These used to be hardcoded here. They now come from the admin, so adding a
 * city or retiring a treatment is something Haider does in a browser rather than
 * something that needs a deployment.
 *
 * The `id` on every type below is Payload's **slug**, not its numeric row id.
 * That is deliberate: a case stores `city_id` and `treatment_type_ids` as plain
 * text in another Postgres schema, and a stable, readable key is what makes that
 * join survive the config being edited, re-seeded, or restored.
 *
 * Every read is wrapped in React's `cache`, so rendering a page that asks for the
 * city list five times hits the database once.
 */

export type { City, College, Stage, TreatmentType, University, WeekDay } from './schema'
// Lives outside this module because it is read by a scheduled job, which cannot
// load a `server-only` module. See ./settings.ts.
export { getContactWindowHours } from './settings'

/** Only `active` rows are offered. Inactive ones stay resolvable so existing
 *  cases still display the name of a treatment that has since been retired. */
export const getCities = cache(async (): Promise<readonly City[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'cities',
    where: { active: { equals: true } },
    sort: 'nameAr',
    limit: 200,
    pagination: false,
  })
  return result.docs.map((doc) => ({ id: doc.slug, nameAr: doc.nameAr }))
})

export const getTreatmentTypes = cache(async (): Promise<readonly TreatmentType[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'treatment-types',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 200,
    pagination: false,
  })
  return result.docs.map((doc) => ({ id: doc.slug, nameAr: doc.nameAr }))
})

/**
 * Resolve a stored slug to a name, including retired ones.
 *
 * A case submitted last month may name a treatment that has since been
 * deactivated. Showing its Arabic name is right; showing the raw slug is not.
 */
export const getAllTreatmentTypes = cache(async (): Promise<readonly TreatmentType[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'treatment-types',
    sort: 'order',
    limit: 200,
    pagination: false,
  })
  return result.docs.map((doc) => ({ id: doc.slug, nameAr: doc.nameAr }))
})

export const getAllCities = cache(async (): Promise<readonly City[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'cities',
    sort: 'nameAr',
    limit: 200,
    pagination: false,
  })
  return result.docs.map((doc) => ({ id: doc.slug, nameAr: doc.nameAr }))
})

/**
 * Whether an id submitted by a form is one we currently offer.
 *
 * Checked against the *active* list, not every row: a retired city must not be
 * selectable on a new case even though old cases still reference it.
 */
export async function isKnownCityId(id: string): Promise<boolean> {
  return (await getCities()).some((city) => city.id === id)
}

export async function isKnownTreatmentTypeId(id: string): Promise<boolean> {
  return (await getTreatmentTypes()).some((treatment) => treatment.id === id)
}

export async function getCityById(id: string): Promise<City | undefined> {
  return (await getAllCities()).find((city) => city.id === id)
}

export async function getTreatmentTypeById(id: string): Promise<TreatmentType | undefined> {
  return (await getAllTreatmentTypes()).find((treatment) => treatment.id === id)
}

/**
 * Relationship fields come back as an id or a populated document depending on
 * depth. We ask for depth 1 and read the slug off the populated side, falling
 * back to null so a row pointing at a deleted parent is skipped rather than
 * crashing a page.
 */
function relatedSlug(value: unknown): string | null {
  if (value && typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: unknown }).slug
    return typeof slug === 'string' ? slug : null
  }
  return null
}

export const getUniversities = cache(async (): Promise<readonly University[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'universities',
    where: { active: { equals: true } },
    sort: 'nameAr',
    depth: 1,
    limit: 500,
    pagination: false,
  })

  return result.docs.flatMap((doc) => {
    const cityId = relatedSlug(doc.city)
    return cityId ? [{ id: doc.slug, nameAr: doc.nameAr, cityId }] : []
  })
})

export const getColleges = cache(async (): Promise<readonly College[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'colleges',
    where: { active: { equals: true } },
    sort: 'nameAr',
    depth: 1,
    limit: 500,
    pagination: false,
  })

  return result.docs.flatMap((doc) => {
    const universityId = relatedSlug(doc.university)
    return universityId ? [{ id: doc.slug, nameAr: doc.nameAr, universityId }] : []
  })
})

export const getStages = cache(async (): Promise<readonly Stage[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'stages',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 100,
    pagination: false,
  })
  return result.docs.map((doc) => ({ id: doc.slug, nameAr: doc.nameAr, order: doc.order }))
})

/**
 * Which treatments a stage may perform at a clinic.
 *
 * This is what decides whether a case is visible to a student, so an absent
 * mapping returns an empty list and the student sees nothing — deliberately
 * conservative. Showing a student a case their stage may not treat wastes a
 * claim and the patient's time; showing them nothing is visible to an admin as
 * "cases are not being claimed", which is at least diagnosable.
 */
export const getStageCapabilityTreatmentIds = cache(
  async (collegeId: string, stageId: string): Promise<readonly string[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'stage-capabilities',
      where: {
        'college.slug': { equals: collegeId },
        'stage.slug': { equals: stageId },
      },
      depth: 1,
      limit: 1,
      pagination: false,
    })

    const capability = result.docs[0]
    if (!capability) return []

    const treatments = capability.treatmentTypes
    if (!Array.isArray(treatments)) return []

    return treatments.flatMap((treatment) => {
      const slug = relatedSlug(treatment)
      return slug ? [slug] : []
    })
  },
)

/** Whether the config needed for a student to describe where they study exists yet. */
export async function hasStudentPlacesConfigured(): Promise<boolean> {
  const [universities, colleges, stages] = await Promise.all([
    getUniversities(),
    getColleges(),
    getStages(),
  ])
  return universities.length > 0 && colleges.length > 0 && stages.length > 0
}

/**
 * The city a college sits in, resolved college → university → city.
 *
 * A student's queue is scoped to the city they actually attend clinic in, and
 * that fact lives across two Payload relationships rather than on the student.
 * Returns null if either link is missing, and the caller shows an empty queue —
 * an empty queue is diagnosable, a queue scoped to the wrong city is not.
 */
export const getCityIdForCollege = cache(async (collegeId: string): Promise<string | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'colleges',
    where: { slug: { equals: collegeId } },
    // Two hops: the college's university, and that university's city.
    depth: 2,
    limit: 1,
    pagination: false,
  })

  const college = result.docs[0]
  if (!college || typeof college.university !== 'object' || college.university === null) return null

  const city = (college.university as { city?: unknown }).city
  return relatedSlug(city)
})

/**
 * The full scope of what a student may see: where they attend, and what their
 * stage may treat there.
 */
export async function getStudentCaseScope(
  collegeId: string,
  stageId: string,
): Promise<{ cityIds: string[]; treatmentTypeIds: string[] }> {
  const [cityId, treatmentTypeIds] = await Promise.all([
    getCityIdForCollege(collegeId),
    getStageCapabilityTreatmentIds(collegeId, stageId),
  ])

  return {
    cityIds: cityId ? [cityId] : [],
    treatmentTypeIds: [...treatmentTypeIds],
  }
}
