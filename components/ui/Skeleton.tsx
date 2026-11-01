import { cx } from "./href";

/** Loading placeholder. Defaults to one 56px row; pass a className for other shapes. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("rounded-control bg-fill motion-safe:animate-pulse", className ?? "h-14")} />
  );
}
