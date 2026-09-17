'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { controlClass, labelClass, hintClass } from '@/components/ui/field'
import { Card, CardBody } from '@/components/ui/card'
import { reviewCopy } from '@/lib/copy'
import { REVIEW_SCALE } from '@/lib/reviews/scale'

export type ReviewFormState = { done?: boolean; error?: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('secondary')}>
      {pending ? reviewCopy.submitting : reviewCopy.submit}
    </button>
  )
}

/**
 * The review form, shared by both sides.
 *
 * One component because the question is the same one: **how was سنون** — not
 * how was the person on the other end. The copy says so twice, once as a
 * heading and once as a hint, because this is the sentence that would erode
 * first and taking it out turns a feedback box into a rating of people.
 *
 * Radio buttons rather than stars: a star widget is a pointer control that needs
 * JavaScript and a keyboard story, and five labelled radios work everywhere,
 * read correctly to a screen reader, and survive a page that never hydrates.
 *
 * The action is passed in rather than imported, because the patient's and the
 * student's differ in exactly one respect — how the caller is identified. A
 * patient proves it with their tracking token, a student with their session and
 * a claim on the case. Neither can be a prop, so neither is.
 */
export function ReviewForm({
  action,
  hidden,
}: {
  action: (
    previous: ReviewFormState,
    formData: FormData,
  ) => Promise<ReviewFormState>
  /** Whatever the action needs to identify the case — a token, or a case id. */
  hidden: Record<string, string>
}) {
  const [state, formAction] = useActionState(action, {})

  if (state.done) {
    return (
      <Card tone="accent">
        <CardBody className="p-4">
          <p className="text-sm">{reviewCopy.done}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody className="p-4">
        <h2 className="text-base font-bold">{reviewCopy.title}</h2>
        <p className="mt-1 text-xs text-foreground-muted">{reviewCopy.scope}</p>
        <p className="mt-1 text-xs text-foreground-muted">{reviewCopy.intro}</p>

        <form action={formAction} className="mt-4 space-y-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <fieldset>
            <legend className={labelClass}>{reviewCopy.ratingLabel}</legend>
            <p className={hintClass}>{reviewCopy.ratingHint}</p>
            {/* An LTR run: the scale reads 1→5 left to right in any language,
                and left in the RTL flow the numbers reverse into 5→1. */}
            <div dir="ltr" className="mt-2 flex gap-2">
              {REVIEW_SCALE.map((value) => (
                <label
                  key={value}
                  className="flex size-12 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-base font-bold has-[:checked]:border-accent has-[:checked]:bg-accent-muted has-[:checked]:text-accent"
                >
                  <input type="radio" name="rating" value={value} required className="sr-only" />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="review-comment">
              {reviewCopy.commentLabel}
            </label>
            <p className={hintClass}>{reviewCopy.commentHint}</p>
            <textarea
              id="review-comment"
              name="comment"
              rows={3}
              maxLength={1000}
              placeholder={reviewCopy.commentPlaceholder}
              className={`${controlClass} py-2`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton />
            {state.error ? (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
