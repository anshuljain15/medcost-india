"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { IconButton } from "./IconButton";
import { cx } from "./href";

// Shared by both sizes: surface, text, shadow, scrim, and the motion-safe
// open animation (opacity + translate-y-4 -> 0 over 250ms via @starting-style).
const COMMON =
  "m-0 w-full max-w-none bg-elevated p-0 text-label shadow-pop backdrop:bg-scrim motion-safe:transition-[opacity,translate] motion-safe:duration-250 motion-safe:ease-standard motion-safe:starting:open:translate-y-4 motion-safe:starting:open:opacity-0";

// Bottom sheet on phones, centred 640px panel from 768px.
const SHEET = "mt-auto max-h-[92dvh] rounded-t-sheet md:m-auto md:max-w-[640px] md:rounded-sheet";

// SearchSheet: full screen below 768px, a 640px panel 96px from the top from 768px.
const FULL =
  "h-[100dvh] max-h-none rounded-none md:mx-auto md:mt-24 md:mb-auto md:h-auto md:max-h-[calc(100dvh-8rem)] md:max-w-[640px] md:rounded-sheet";

/** True when (x, y) lies outside the dialog's own box, i.e. on the ::backdrop. */
function outsideBox(dialog: HTMLDialogElement, x: number, y: number): boolean {
  const r = dialog.getBoundingClientRect();
  return x < r.left || x > r.right || y < r.top || y > r.bottom;
}

/**
 * Native <dialog> opened with showModal(): focus trap, Escape, inert
 * background and top layer for free. `onClose` runs however it closes
 * (Escape, the X button, a tap on the scrim, or `open` turning false).
 * `full` gives the SearchSheet geometry.
 *
 * A scrim tap is a press that starts and ends outside the dialog's box. A
 * click on the dialog's own blank area (below short content in the
 * full-screen sheet, where people tap to drop the keyboard) never closes it,
 * and neither does a drag that ends on the scrim.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  full,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOutside = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => onClose()}
      onPointerDown={(e) => {
        pressedOutside.current = e.target === e.currentTarget && outsideBox(e.currentTarget, e.clientX, e.clientY);
      }}
      onClick={(e) => {
        const dialog = e.currentTarget;
        const scrim = pressedOutside.current && e.target === dialog && outsideBox(dialog, e.clientX, e.clientY);
        pressedOutside.current = false;
        if (scrim) dialog.close();
      }}
      className={cx(COMMON, full ? FULL : SHEET)}
    >
      <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-2 bg-elevated pr-2 pl-5">
        <h2 id={titleId} className="min-w-0 truncate text-headline text-label">
          {label}
        </h2>
        <IconButton icon="x" label={t("common.close")} onClick={() => ref.current?.close()} />
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
    </dialog>
  );
}
