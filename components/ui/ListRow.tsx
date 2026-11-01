import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { NewTabNote } from "./NewTabNote";
import { cx, isRoutable } from "./href";

/**
 * One row of an InsetGroup (renders the <li>). Linked rows get a hover fill,
 * an inset focus ring and a chevron (the `external` icon for external links).
 * Rows without `href` are plain text and show no chevron, e.g. unmatched
 * hospital names.
 *
 * layout="stack": below 768px the trailing value moves under the text
 * (text-callout, left-aligned); from 768px it sits in the trailing slot. It is
 * one element placed by a two-column grid, so it is never rendered twice.
 */
export function ListRow({
  href,
  external,
  leading,
  title,
  subtitle,
  meta,
  badges,
  trailing,
  layout = "inline",
}: {
  href?: string;
  external?: boolean;
  leading?: IconName;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  trailing?: React.ReactNode;
  layout?: "inline" | "stack";
}) {
  const linked = Boolean(href);
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== false;

  const textParts = (
    <>
      <div className="text-body text-label">{title}</div>
      {subtitle && <div className="text-callout text-label-2">{subtitle}</div>}
      {meta && <div className="text-footnote text-label-2">{meta}</div>}
      {badges && <div className="mt-1 flex flex-wrap gap-1.5">{badges}</div>}
      {linked && external && <NewTabNote />}
    </>
  );

  const content = (
    <>
      {leading && <Icon name={leading} className="size-6 shrink-0 text-label-2" />}
      {layout === "stack" && hasTrailing ? (
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="min-w-0">{textParts}</div>
          <div className="col-span-full mt-0.5 text-left text-callout tabular-nums text-label md:col-span-1 md:mt-0 md:text-right md:text-headline">
            {trailing}
          </div>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">{textParts}</div>
          {hasTrailing && (
            <div className="ml-auto shrink-0 text-right text-headline tabular-nums text-label">{trailing}</div>
          )}
        </>
      )}
      {linked && <Icon name={external ? "external" : "chevron-right"} className="size-5 shrink-0 text-label-3" />}
    </>
  );

  const innerClass = cx(
    "flex min-h-14 items-center gap-3 px-4 py-3",
    linked && "transition-colors duration-150 hover:bg-fill focus-visible:outline-offset-[-3px]"
  );

  let inner: React.ReactNode;
  if (href && external) {
    inner = (
      <a href={href} target="_blank" rel="noopener noreferrer" className={innerClass}>
        {content}
      </a>
    );
  } else if (href && isRoutable(href)) {
    inner = (
      <Link href={href} className={innerClass}>
        {content}
      </Link>
    );
  } else if (href) {
    inner = (
      <a href={href} className={innerClass}>
        {content}
      </a>
    );
  } else {
    inner = <div className={innerClass}>{content}</div>;
  }

  return (
    <li
      className={cx(
        "relative after:absolute after:bottom-0 after:right-0 after:h-px after:bg-hairline last:after:hidden",
        leading ? "after:left-14" : "after:left-4"
      )}
    >
      {inner}
    </li>
  );
}
