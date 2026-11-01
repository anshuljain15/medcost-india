"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon } from "./Icon";

const MARK = "\u0001";

/**
 * "‹ Treatment costs", read as "Back to Treatment costs" ("इलाज का खर्च पर
 * वापस" in Hindi). The nav.backTo template is split around {page}, so the
 * visually hidden words land on the correct side of the label in both locales.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  const { t } = useTranslation();
  const template = t("nav.backTo", { page: MARK });
  const [before, after = ""] = template.includes(MARK) ? template.split(MARK) : ["", ""];
  return (
    <Link
      href={href}
      className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-callout font-medium text-accent hover:bg-fill"
    >
      <Icon name="chevron-left" className="size-5 shrink-0" />
      {before.trim() && <span className="sr-only">{before.trim()} </span>}
      <span>{label}</span>
      {after.trim() && <span className="sr-only"> {after.trim()}</span>}
    </Link>
  );
}
