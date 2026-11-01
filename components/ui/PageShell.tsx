import { cx } from "./href";

/** Page container: gutter, top/bottom rhythm and one of the two widths (§3.3). */
export function PageShell({
  width = "read",
  className,
  children,
}: {
  width?: "read" | "page";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "mx-auto w-full px-4 pt-6 pb-16 md:px-6 md:pt-12",
        width === "page" ? "max-w-page" : "max-w-read",
        className
      )}
    >
      {children}
    </div>
  );
}
