import { WEEK_DAYS } from '@/lib/config/schema'
import { caseForm, studentQueue } from '@/lib/copy'
import { buttonClass } from '@/components/ui/button'
import { optionClass } from '@/components/ui/field'
import { FilterIcon } from '@/components/ui/icon'

/**
 * Filtering the queue, by day and by treatment, several of each.
 *
 * **It is a plain GET form and a `<details>`, with no JavaScript anywhere.**
 * That is the same decision the guided questions made and for the same reason:
 * the browser builds the query string and navigates, so the whole thing works
 * before hydration, with JavaScript disabled, and on a phone that never finishes
 * running it. A filter that needs a bundle to arrive is a filter that does not
 * work on the connection this product exists to serve.
 *
 * Closed by default, with the active count in the summary. A student who has not
 * filtered should see cases, not controls — the queue is a tool and chrome above
 * the thing itself is a cost on a 360px screen.
 *
 * **Nothing here decides what a student may see.** The values land in
 * `onlyTreatmentTypeIds` and `onlyDays`, which narrow within the stage's scope
 * and can only ever remove cases from the list. Putting them in the scope field
 * instead would let `?t=root-canal` hand a fourth year a fifth year's queue.
 */
export function QueueFilter({
  treatments,
  selectedDays,
  selectedTreatments,
}: {
  /** Only what this student's stage may treat — filtering by anything else is
      not a filter, it is a request for somebody else's queue. */
  treatments: readonly { id: string; nameAr: string }[]
  selectedDays: readonly string[]
  selectedTreatments: readonly string[]
}) {
  const active = selectedDays.length + selectedTreatments.length

  return (
    <details
      // Left open when something is filtered, or the student cannot see what is
      // hiding cases from them — which reads as an empty queue.
      open={active > 0}
      className="rounded-lg border border-border bg-surface"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-bold">
        <FilterIcon className="text-accent" />
        <span>{studentQueue.filterTitle}</span>
        {active > 0 ? (
          <span className="ms-auto rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
            {studentQueue.filterActive(active)}
          </span>
        ) : null}
      </summary>

      <form method="get" className="space-y-4 border-t border-border p-4">
        <fieldset>
          <legend className="text-xs font-bold text-accent">{studentQueue.filterDays}</legend>
          <p className="mt-1 text-xs text-foreground-muted">{studentQueue.filterDaysHint}</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WEEK_DAYS.map((day) => (
              <li key={day}>
                <label className={optionClass}>
                  <input
                    type="checkbox"
                    name="d"
                    value={day}
                    defaultChecked={selectedDays.includes(day)}
                    className="size-4"
                  />
                  {caseForm.weekDays[day]}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold text-accent">{studentQueue.filterTreatments}</legend>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {treatments.map((treatment) => (
              <li key={treatment.id}>
                <label className={optionClass}>
                  <input
                    type="checkbox"
                    name="t"
                    value={treatment.id}
                    defaultChecked={selectedTreatments.includes(treatment.id)}
                    className="size-4"
                  />
                  {treatment.nameAr}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass('secondary')}>
            {studentQueue.filterApply}
          </button>
          {active > 0 ? (
            // A plain link, not a reset button: reset restores the *defaults*,
            // which here are the boxes that are already ticked. This has to
            // clear the query string, and an <a> is the only thing that does
            // that without JavaScript.
            <a href="/student" className={buttonClass('quiet')}>
              {studentQueue.filterClear}
            </a>
          ) : null}
        </div>
      </form>
    </details>
  )
}
