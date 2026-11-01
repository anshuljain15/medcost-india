/**
 * The one primary action of a focus-mode screen: pinned to the bottom on
 * phones (above the safe area), inline from 768px.
 *
 * `data-sticky-action` lets app/globals.css (no JS) give the body room for
 * the bar below 768px, so nothing on the page ends under it, and hide the bar
 * while a combobox list is open, so it never covers the list's last options.
 */
export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-sticky-action=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:mt-8 md:border-0 md:bg-transparent md:p-0"
    >
      {children}
    </div>
  );
}
