'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { casePhotos } from '@/lib/copy'
import {
  MAX_PHOTOS_PER_CASE,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_BYTES_TOTAL,
} from '@/lib/images/limits'
import {
  applyPhotoEdits,
  canEditPhotos,
  hasEdits,
  NO_EDITS,
  rotateBy,
  setInputFiles,
  type CropRect,
  type PhotoEdits,
} from '@/lib/images/edit'
import { hintClass, labelClass } from '@/components/ui/field'
import { CloseIcon, CropIcon, RotateIcon } from '@/components/ui/icon'

/**
 * Choosing intraoral photographs, and seeing them before they are sent.
 *
 * The form used to take whatever was picked and show nothing back, which made
 * "لا تصوّر وجهك" advice rather than something anybody could act on. The
 * preview is the point; the small editor on it is what a patient does once they
 * see a lip in the frame.
 *
 * **It is an enhancement over a working control, not a replacement for one.**
 * The real `<input type="file" name="photos">` is still here and still what the
 * form posts. With no JavaScript, or on a browser without `DataTransfer`, the
 * originals go up exactly as they did before and the server does what it always
 * did. The case form is the one thing in سنون that must never acquire a step.
 */

type Item = {
  id: number
  /** Edits always apply to this, never to the last result — see `edit.ts`. */
  original: File
  edits: PhotoEdits
  /** The original with the edits applied. What is uploaded, and what is shown. */
  file: File
  url: string
}

let nextId = 0

/** Capability does not change while the page is open. */
const subscribeNever = () => () => {}

/** The same rules the server applies, so the browser can say no first. */
function describeSelection(files: File[], existing: number): string | null {
  if (files.length + existing > MAX_PHOTOS_PER_CASE) return casePhotos.errors.tooMany
  if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return casePhotos.errors.tooLarge

  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_PHOTO_BYTES_TOTAL) return casePhotos.errors.tooLargeTotal

  return null
}

export function PhotoPicker({ serverError }: { serverError?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  /** What the styled label says when there is no enhancement to count items. */
  const [plainCount, setPlainCount] = useState(0)
  /**
   * Whether this browser can be enhanced at all.
   *
   * Read through `useSyncExternalStore` because the server and the first client
   * render have to agree and `DataTransfer` is a browser fact: the server
   * snapshot is `false`, so the markup React sends is the plain control — which
   * is also the fallback, and is what a browser that never hydrates keeps.
   * It never changes after that, hence a subscribe that does nothing.
   */
  const enhanced = useSyncExternalStore(subscribeNever, canEditPhotos, () => false)

  // Object URLs are a leak if nothing revokes them, and a phone with four
  // photographs open is exactly where that shows.
  useEffect(() => {
    return () => {
      for (const item of items) URL.revokeObjectURL(item.url)
    }
    // Deliberately on unmount only: revoking on every change would kill URLs
    // still being rendered. Each replacement revokes its own below.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Write the current list into the real input, which is what the form posts. */
  const syncInput = useCallback((next: Item[]) => {
    const input = inputRef.current
    if (!input) return
    setInputFiles(
      input,
      next.map((item) => item.file),
    )
  }, [])

  const commit = useCallback(
    (next: Item[]) => {
      setItems(next)
      syncInput(next)
    },
    [syncInput],
  )

  const onPick = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target
      const picked = Array.from(input.files ?? [])
      if (picked.length === 0) return

      // Without the enhancement the input is the whole feature: validate and
      // leave the browser's own selection alone.
      if (!enhanced) {
        const plainProblem = describeSelection(picked, 0)
        setError(plainProblem)
        if (plainProblem) input.value = ''
        setPlainCount(plainProblem ? 0 : picked.length)
        return
      }

      const problem = describeSelection(picked, items.length)
      if (problem) {
        setError(problem)
        // Put the existing selection back: picking a fifth photograph must not
        // throw away the four already chosen.
        syncInput(items)
        return
      }
      setError(null)

      setBusy(true)
      try {
        const added: Item[] = []
        for (const original of picked) {
          const file = await applyPhotoEdits(original, NO_EDITS)
          added.push({
            id: nextId++,
            original,
            edits: NO_EDITS,
            file,
            url: URL.createObjectURL(file),
          })
        }
        commit([...items, ...added])
      } finally {
        setBusy(false)
      }
    },
    [commit, enhanced, items, syncInput],
  )

  const reEdit = useCallback(
    async (id: number, edits: PhotoEdits) => {
      const target = items.find((item) => item.id === id)
      if (!target) return

      setBusy(true)
      try {
        const file = await applyPhotoEdits(target.original, edits)
        URL.revokeObjectURL(target.url)
        commit(
          items.map((item) =>
            item.id === id ? { ...item, edits, file, url: URL.createObjectURL(file) } : item,
          ),
        )
      } finally {
        setBusy(false)
      }
    },
    [commit, items],
  )

  const remove = useCallback(
    (id: number) => {
      const target = items.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.url)
      if (editing === id) setEditing(null)
      setError(null)

      const next = items.filter((item) => item.id !== id)
      commit(next)
      // An emptied input still reports its old selection to the browser's own
      // UI, and re-picking the same file would then fire no change event.
      if (next.length === 0 && inputRef.current) inputRef.current.value = ''
    },
    [commit, editing, items],
  )

  const count = enhanced ? items.length : plainCount
  // Only the enhanced path can add to a selection; the native control replaces
  // it wholesale, so it must stay usable at four.
  const full = enhanced && items.length >= MAX_PHOTOS_PER_CASE
  const shown = error ?? serverError

  return (
    <div>
      <label htmlFor="photos" className={labelClass}>
        {casePhotos.label}
      </label>
      <p className={hintClass}>{casePhotos.hint}</p>
      {/* The guide requires this warning, in Arabic, on the upload itself. */}
      <p className="mt-2 text-sm font-medium text-warning">{casePhotos.faceWarning}</p>

      {/* The native control renders its own English, left-to-right button that
          cannot be translated or restyled. It is kept — it is the thing that
          actually opens the picker, and it stays reachable by keyboard and
          screen reader — but visually hidden behind a label that acts as the
          button. */}
      <label
        htmlFor="photos"
        data-disabled={full || undefined}
        className="mt-2 flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-surface-muted px-4 text-sm font-medium data-disabled:cursor-not-allowed data-disabled:opacity-50"
      >
        {count === 0
          ? casePhotos.choose
          : count === 1
            ? casePhotos.chosenOne
            : casePhotos.chosen(count)}
      </label>
      <input
        ref={inputRef}
        id="photos"
        name="photos"
        type="file"
        accept="image/*"
        multiple
        disabled={full}
        // capture is deliberately omitted: on a phone this offers both the
        // camera and the gallery, and a patient may already have a photo.
        className="sr-only"
        onChange={onPick}
      />

      {busy ? (
        <p role="status" className="mt-2 text-sm text-foreground-muted">
          {casePhotos.preview.preparing}
        </p>
      ) : null}

      {items.length > 0 ? (
        <>
          <p className="mt-3 text-xs text-foreground-muted">{casePhotos.preview.hint}</p>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item, index) => (
              <li key={item.id} className="overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={casePhotos.preview.alt(index + 1)}
                  className="block aspect-square w-full bg-surface-muted object-cover"
                />
                <div className="flex items-stretch justify-between border-t border-border text-xs">
                  <PickerAction
                    label={casePhotos.preview.rotate}
                    title={casePhotos.preview.rotateOne(index + 1)}
                    onClick={() =>
                      reEdit(item.id, { ...item.edits, rotation: rotateBy(item.edits.rotation, 1) })
                    }
                  >
                    <RotateIcon />
                  </PickerAction>
                  <PickerAction
                    label={casePhotos.preview.crop}
                    title={casePhotos.preview.cropOne(index + 1)}
                    onClick={() => setEditing(editing === item.id ? null : item.id)}
                  >
                    <CropIcon />
                  </PickerAction>
                  <PickerAction
                    label={casePhotos.preview.remove}
                    title={casePhotos.preview.removeOne(index + 1)}
                    danger
                    onClick={() => remove(item.id)}
                  >
                    <CloseIcon />
                  </PickerAction>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {editing !== null
        ? (() => {
            const item = items.find((entry) => entry.id === editing)
            if (!item) return null
            return (
              <CropEditor
                item={item}
                index={items.indexOf(item) + 1}
                onCancel={() => setEditing(null)}
                onApply={(crop) => {
                  setEditing(null)
                  void reEdit(item.id, { ...item.edits, crop })
                }}
                onReset={() => {
                  setEditing(null)
                  void reEdit(item.id, NO_EDITS)
                }}
              />
            )
          })()
        : null}

      <p className="mt-2 text-xs text-foreground-muted">{casePhotos.privacy}</p>
      {shown ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {shown}
        </p>
      ) : null}
    </div>
  )
}

function PickerAction({
  label,
  title,
  danger,
  onClick,
  children,
}: {
  label: string
  title: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex min-h-11 flex-1 items-center justify-center gap-1 ${
        danger ? 'text-danger' : 'text-foreground-muted'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

/**
 * The crop frame.
 *
 * Drawn over the picture at whatever size it happens to be on screen, and it
 * reports fractions rather than pixels, so the result does not depend on how
 * wide the phone is. Pointer events rather than touch events: one set of
 * handlers covers a finger, a mouse and a stylus, and `setPointerCapture` keeps
 * a drag alive when the finger leaves the picture — which on a small screen it
 * will, repeatedly.
 */
type DragCorner = 'nw' | 'ne' | 'sw' | 'se' | 'move'

function CropEditor({
  item,
  index,
  onApply,
  onReset,
  onCancel,
}: {
  item: Item
  index: number
  onApply: (crop: CropRect) => void
  /** Clears the rotation as well: "put the original back" means all of it. */
  onReset: () => void
  onCancel: () => void
}) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [crop, setCrop] = useState<CropRect>(
    item.edits.crop ?? { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
  )

  const drag = useRef<{ corner: DragCorner; x: number; y: number } | null>(null)

  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current
    const frame = frameRef.current
    if (!state || !frame) return

    const bounds = frame.getBoundingClientRect()
    if (bounds.width === 0 || bounds.height === 0) return
    const dx = (event.clientX - state.x) / bounds.width
    const dy = (event.clientY - state.y) / bounds.height
    state.x = event.clientX
    state.y = event.clientY

    setCrop((current) => {
      const MIN = 0.1
      if (state.corner === 'move') {
        return {
          ...current,
          x: Math.min(Math.max(current.x + dx, 0), 1 - current.width),
          y: Math.min(Math.max(current.y + dy, 0), 1 - current.height),
        }
      }

      let { x, y, width, height } = current
      // A west or north handle moves the edge and shrinks the box by the same
      // amount; an east or south one only changes the size.
      if (state.corner === 'nw' || state.corner === 'sw') {
        const nextX = Math.min(Math.max(x + dx, 0), x + width - MIN)
        width += x - nextX
        x = nextX
      } else {
        width = Math.min(Math.max(width + dx, MIN), 1 - x)
      }
      if (state.corner === 'nw' || state.corner === 'ne') {
        const nextY = Math.min(Math.max(y + dy, 0), y + height - MIN)
        height += y - nextY
        y = nextY
      } else {
        height = Math.min(Math.max(height + dy, MIN), 1 - y)
      }
      return { x, y, width, height }
    })
  }

  /**
   * One handler for the box and all four handles, with which corner is being
   * dragged read off the element. A handler built per corner during render
   * would close over the ref, and a ref is not a rendering value.
   */
  const begin = (event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const corner = (event.currentTarget.dataset.corner ?? 'move') as DragCorner
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { corner, x: event.clientX, y: event.clientY }
  }

  const end = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.current = null
  }

  const handles = ['nw', 'ne', 'sw', 'se'] as const
  /*
   * Tucked inside the frame's corners rather than straddling them. A handle
   * that hangs outside would be cut off by the `overflow-hidden` that keeps the
   * dimming on the picture, and would also sit off the image entirely once the
   * crop is dragged to an edge.
   */
  const corner = {
    nw: 'start-0 top-0',
    ne: 'end-0 top-0',
    sw: 'start-0 bottom-0',
    se: 'end-0 bottom-0',
  } as const

  return (
    <div className="mt-3 rounded-md border border-border bg-surface-muted p-3">
      <p className="text-xs text-foreground-muted">{casePhotos.preview.cropTitle}</p>

      {/*
        `dir="ltr"` on the frame, and it is the one place in سنون where that is
        right rather than a slip. A photograph has no reading direction: the
        crop's x is measured from the picture's own left edge, which is where
        the canvas reads it from and where `event.clientX` grows from. Leaving
        the frame RTL would make `inset-inline-start` mean the right edge and
        mirror every crop against the image it was drawn on. Everything inside
        stays logical; it is the *meaning* of start that is pinned here.
      */}
      <div
        ref={frameRef}
        dir="ltr"
        /* overflow-hidden confines the dimming below to the picture. Without
           it the 9999px spread reaches the edges of the viewport and darkens
           the whole form around a crop frame. */
        className="relative mx-auto mt-2 w-full max-w-sm touch-none select-none overflow-hidden rounded"
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={casePhotos.preview.alt(index)}
          draggable={false}
          className="block w-full rounded"
        />
        <div
          data-corner="move"
          onPointerDown={begin}
          className="absolute cursor-move border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            // Percentages of the picture, not pixels: the same crop on any
            // screen, and the same numbers the canvas crops with.
            insetInlineStart: `${crop.x * 100}%`,
            insetBlockStart: `${crop.y * 100}%`,
            inlineSize: `${crop.width * 100}%`,
            blockSize: `${crop.height * 100}%`,
          }}
        >
          {handles.map((name) => (
            <span
              key={name}
              data-corner={name}
              onPointerDown={begin}
              /* 20px rather than the 8px a mouse would need: this is dragged
                 with a thumb on a phone before it is dragged with anything
                 else. */
              className={`absolute block size-5 rounded-full border-2 border-surface bg-accent ${corner[name]}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onApply(crop)}
          className="min-h-11 flex-1 rounded-full bg-accent-fill px-4 text-sm font-bold text-accent-foreground"
        >
          {casePhotos.preview.cropApply}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-medium"
        >
          {casePhotos.preview.cropCancel}
        </button>
        {hasEdits(item.edits) ? (
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-full px-4 text-sm font-medium text-foreground-muted underline"
          >
            {casePhotos.preview.cropReset}
          </button>
        ) : null}
      </div>
    </div>
  )
}
