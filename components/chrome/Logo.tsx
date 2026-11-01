"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * The logo mark (§5.2): a 28px rounded-lg accent square with the accent-fg
 * "range" glyph |—| (two 10px ticks joined by a bar). Same geometry as
 * app/icon.svg.
 */
function LogoMark() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-accent-fg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 28 28"
        width={28}
        height={28}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
        className="size-7"
      >
        <path d="M9 9v10M19 9v10M9 14h10" />
      </svg>
    </span>
  );
}

/**
 * Home link: mark + "MedCost India". The accessible name is nav.homeLink, so
 * the wordmark itself is aria-hidden. `compact` (focus mode) shows the
 * wordmark only from 768px.
 */
export default function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Link
      href="/"
      aria-label={t("nav.homeLink")}
      className="-ml-1 flex min-h-11 items-center gap-2 rounded-control px-1 text-headline text-label"
    >
      <LogoMark />
      <span aria-hidden="true" translate="no" className={compact ? "hidden md:inline" : undefined}>
        MedCost India
      </span>
    </Link>
  );
}
