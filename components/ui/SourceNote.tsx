"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatISODate } from "@/lib/format";
import { Icon } from "./Icon";
import { ExtLink, InlineLink } from "./InlineLink";

/** Section ids on /methodology. */
export type MethodAnchor =
  | "market-prices"
  | "govt-rates"
  | "medicines"
  | "stores"
  | "checks"
  | "patient-bills"
  | "hospitals"
  | "reviews"
  | "dates"
  | "corrections";

/**
 * "Source: HexaHealth · Market estimate, not a bill · date not recorded · How we
 * get prices". Sits directly under the price it supports. It never invents a
 * date: a null date always reads "date not recorded".
 *
 * `compact` (search footers) drops the icon and the methodology link.
 */
export function SourceNote({
  source,
  href,
  qualifier,
  date,
  anchor,
  compact,
}: {
  source: string;
  href?: string;
  qualifier?: string;
  date: string | null;
  anchor: MethodAnchor;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <p className="mt-3 flex gap-1.5 text-footnote text-label-2">
      {!compact && <Icon name="source" className="mt-0.5 size-4 shrink-0" />}
      <span className="min-w-0">
        {t("source.label")} {href ? <ExtLink href={href}>{source}</ExtLink> : source}
        {qualifier && ` · ${qualifier}`}
        {" · "}
        {date ? t("source.retrieved", { date: formatISODate(date) }) : t("source.noDate")}
        {!compact && (
          <>
            {" · "}
            <InlineLink href={`/methodology#${anchor}`}>{t("source.howWeGet")}</InlineLink>
          </>
        )}
      </span>
    </p>
  );
}
