import Link from "next/link";
import { Icon } from "./Icon";
import { NewTabNote } from "./NewTabNote";
import { isRoutable } from "./href";

const CLASS = "inline-flex min-h-11 items-center gap-1 text-headline text-accent underline-offset-4 hover:underline";

/**
 * "See prices at each hospital ›". An external link opens in a new tab and
 * swaps the chevron for the `external` icon.
 */
export function ActionLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={CLASS}>
        <span>{children}</span>
        <Icon name="external" className="size-4.5 shrink-0" />
        <NewTabNote />
      </a>
    );
  }
  const inner = (
    <>
      <span>{children}</span>
      <Icon name="chevron-right" className="size-4.5 shrink-0" />
    </>
  );
  return isRoutable(href) ? (
    <Link href={href} className={CLASS}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={CLASS}>
      {inner}
    </a>
  );
}
