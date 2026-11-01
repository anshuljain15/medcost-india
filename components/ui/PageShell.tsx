import { cx } from "./href";

/**
 * Page container: gutter, top/bottom rhythm and one of the two widths (§3.3).
 *
 * Both widths share the header's left edge: the outer box is always the
 * centred max-w-page column (the same one the header and footer use), and
 * "read" pages put a left-aligned max-w-read column inside it. So at 1440px
 * the H1 starts under the logo on every page, instead of jumping ~170px
 * between home / city pages and reading pages.
 */
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
    <div className={cx("mx-auto w-full max-w-page px-4 pt-6 pb-16 md:px-6 md:pt-12", className)}>
      {width === "read" ? <div className="max-w-read">{children}</div> : children}
    </div>
  );
}
