import { cx } from "./href";

/** Static card: no border, no shadow (shadows are for interactive cards only). */
export function Card({
  as: Tag = "div",
  className,
  children,
}: {
  as?: "div" | "section" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return <Tag className={cx("rounded-card bg-surface p-5 md:p-6", className)}>{children}</Tag>;
}
