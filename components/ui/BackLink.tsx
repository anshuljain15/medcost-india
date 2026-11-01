"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon } from "./Icon";
import { IntentLink, type PrefetchMode } from "./IntentLink";

const MARK = "\u0001";

/**
 * "‹ Treatment costs", read as "Back to Treatment costs" ("इलाज का खर्च पर
 * वापस" in Hindi). The nav.backTo template is split around {page}, so the
 * visually hidden words land on the correct side of the label in both locales.
 *
 * `prefetch`: as ListRow. A back link to a heavy route (a city page from a
 * hospital page) passes "intent".
 */
export function BackLink({ href, label, prefetch = true }: { href: string; label: string; prefetch?: PrefetchMode }) {
  const { t } = useTranslation();
  const template = t("nav.backTo", { page: MARK });
  const [before, after = ""] = template.includes(MARK) ? template.split(MARK) : ["", ""];
  const className =
    "-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-callout font-medium text-accent hover:bg-fill";
  const content = (
    <>
      <Icon name="chevron-left" className="size-5 shrink-0" />
      {before.trim() && <span className="sr-only">{before.trim()} </span>}
      <span>{label}</span>
      {after.trim() && <span className="sr-only"> {after.trim()}</span>}
    </>
  );
  if (prefetch === "intent") {
    return (
      <IntentLink href={href} className={className}>
        {content}
      </IntentLink>
    );
  }
  return (
    <Link href={href} prefetch={prefetch ? undefined : false} className={className}>
      {content}
    </Link>
  );
}
