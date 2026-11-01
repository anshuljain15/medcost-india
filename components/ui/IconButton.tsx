import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { cx, isRoutable } from "./href";

const CLASS =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-label transition-colors duration-150 hover:bg-fill";

/**
 * 44px round icon control; `label` is its accessible name. With `href` it is a
 * link (next/link for in-app paths, a plain same-tab <a> otherwise).
 * `className` is for placement only (e.g. "lg:hidden", absolute positioning).
 */
export function IconButton({
  icon,
  label,
  href,
  onClick,
  className,
}: {
  icon: IconName;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = <Icon name={icon} className="size-6" />;
  const classes = cx(CLASS, className);
  if (href) {
    return isRoutable(href) ? (
      <Link href={href} aria-label={label} className={classes} onClick={onClick}>
        {inner}
      </Link>
    ) : (
      <a href={href} aria-label={label} className={classes} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" aria-label={label} className={classes} onClick={onClick}>
      {inner}
    </button>
  );
}
