"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { INLINE_LINK_CLASS } from "./InlineLink";
import type { MethodAnchor } from "./SourceNote";

/**
 * "Sources and notes": the block every content page ends with. Its last line
 * always links to the matching section of /methodology.
 */
export function PageNotes({
  anchor,
  linkKey = "source.howWeGet",
  children,
}: {
  anchor: MethodAnchor;
  linkKey?: string;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <aside aria-labelledby="page-notes" className="mt-12 border-t border-hairline pt-6">
      <h2 id="page-notes" className="text-headline text-label">
        {t("common.sourcesNotes")}
      </h2>
      <div className="mt-3 max-w-[65ch] space-y-3 text-footnote text-label-2">
        {children}
        <p>
          {/* The InlineLink look; it stands on its own line, so it gets a 44px target. */}
          <Link href={`/methodology#${anchor}`} className={`${INLINE_LINK_CLASS} inline-flex min-h-11 items-center`}>
            {t(linkKey)}
          </Link>
        </p>
      </div>
    </aside>
  );
}
