// Guarantees a build-time error rather than a mysterious bundling failure if a
// Client Component ever imports this module.
import 'server-only'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { City, Stage, TreatmentType, University } from './schema'

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

export type { City, Stage, TreatmentType, University, WeekDay } from './schema'
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
 * Which treatments a stage may perform at a university.
 *
 * This is what decides whether a case is visible to a student, and **the
 * normal answer is the stage's own default** — the per-university row is an
 * exception that is expected to stay empty.
 *
 * Haider's instruction, and the reason it is keyed by university rather than by
 * clinic: a few universities, mostly in the north and Kurdistan, are said to
 * differ — students onto real patients earlier, possibly molar endodontics that
 * the rest of Iraq forbids. He is not certain of either, so **nothing is seeded
 * for them**. What exists is the shape: if students from one university turn up
 * in numbers and say their stage may do something the default forbids, it is one
 * row in the admin and no deployment.
 */
export const getStageCapabilityTreatmentIds = cache(
  async (universityId: string, stageId: string): Promise<readonly string[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'stage-capabilities',
      where: {
        'university.slug': { equals: universityId },
        'stage.slug': { equals: stageId },
      },
      depth: 1,
      limit: 1,
      pagination: false,
    })

    const capability = result.docs[0]
    const treatments = capability?.treatmentTypes

    if (Array.isArray(treatments) && treatments.length > 0) {
      return treatments.flatMap((treatment) => {
        const slug = relatedSlug(treatment)
        return slug ? [slug] : []
      })
    }

    // No exception row, so what this stage can do anywhere. This is the path
    // almost every student takes, and it must stay that way: a matrix somebody
    // has to fill in by hand before anyone sees a case is how an empty queue
    // gets read as "no patients" rather than as a missing row.
    return getStageDefaultTreatmentIds(stageId)
  },
)

/**
 * What a stage may treat anywhere, absent an exception.
 *
 * A stage whose default list is **empty** is the mechanism for "this exists in
 * one place only": add the stage, leave its defaults empty — nothing is what it
 * can do anywhere, truthfully — and grant it in `stage-capabilities` for the one
 * university that allows it. That is how a second-year stage would work if the
 * northern universities turn out to run one.
 */
export const getStageDefaultTreatmentIds = cache(
  async (stageId: string): Promise<readonly string[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'stages',
      where: { slug: { equals: stageId } },
      depth: 1,
      limit: 1,
      pagination: false,
    })

    const defaults = result.docs[0]?.defaultTreatmentTypes
    if (!Array.isArray(defaults)) return []

    return defaults.flatMap((treatment) => {
      const slug = relatedSlug(treatment)
      return slug ? [slug] : []
    })
  },
)

/** Whether the config needed for a student to describe where they study exists yet. */
export async function hasStudentPlacesConfigured(): Promise<boolean> {
  const [universities, stages] = await Promise.all([getUniversities(), getStages()])
  return universities.length > 0 && stages.length > 0
}

/**
 * The city a university sits in.
 *
 * A student's queue is scoped to the city they actually attend clinic in, and
 * that fact lives on the university rather than on the student. It used to be
 * two hops — college → university → city — which is one hop more than the world
 * has, now that a university and its dental college are the same thing.
 *
 * Returns null if the link is missing, and the caller shows an empty queue: an
 * empty queue is diagnosable, a queue scoped to the wrong city is not.
 */
export const getCityIdForUniversity = cache(async (universityId: string): Promise<string | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'universities',
    where: { slug: { equals: universityId } },
    depth: 1,
    limit: 1,
    pagination: false,
  })

  return relatedSlug(result.docs[0]?.city)
})

/**
 * The full scope of what a student may see: where they attend, and what their
 * stage may treat there.
 */
export async function getStudentCaseScope(
  universityId: string,
  stageId: string,
): Promise<{ cityIds: string[]; treatmentTypeIds: string[] }> {
  const [cityId, treatmentTypeIds] = await Promise.all([
    getCityIdForUniversity(universityId),
    getStageCapabilityTreatmentIds(universityId, stageId),
  ])

  return {
    cityIds: cityId ? [cityId] : [],
    treatmentTypeIds: [...treatmentTypeIds],
  }
}
