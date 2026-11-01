/**
 * The one primary action of a focus-mode screen: pinned to the bottom on
 * phones (above the safe area), inline from 768px. The page adds
 * `pb-28 md:pb-0` so the bar never covers content.
 */
export function StickyActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:mt-8 md:border-0 md:bg-transparent md:p-0">
      {children}
    </div>
  );
}
