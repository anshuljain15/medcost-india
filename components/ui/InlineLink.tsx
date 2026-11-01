import Link from "next/link";
import { Icon } from "./Icon";
import { NewTabNote } from "./NewTabNote";
import { isRoutable } from "./href";

/** Always underlined, so a link in running text never relies on colour alone. */
export const INLINE_LINK_CLASS = "text-accent underline decoration-1 underline-offset-2 hover:text-accent-hover";

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (isRoutable(href)) {
    return (
      <Link href={href} className={INLINE_LINK_CLASS}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={INLINE_LINK_CLASS}>
      {children}
    </a>
  );
}

/** External link: new tab, `external` icon and a spoken "(opens in a new tab)". */
export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={INLINE_LINK_CLASS}>
      {children}
      <Icon name="external" className="ml-0.5 inline size-4 align-[-2px]" />
      <NewTabNote />
    </a>
  );
}
