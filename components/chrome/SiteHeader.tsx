"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { LanguageSwitch } from "@/components/ui/LanguageSwitch";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { SECTIONS, ariaCurrent, focusRouteFor, hasHeroSearch } from "@/lib/nav";
import type { MedicinesMeta } from "@/lib/types";
import { loadHospitalIndex, loadProcedureIndex } from "@/lib/staticData";
import Logo from "./Logo";

// The search sheet and its index code load on first open only.
const SearchSheet = dynamic(() => import("./SearchSheet"), { ssr: false });

/** Warm the sheet chunk and the two indexes on pointerenter / focus of a search button. */
function prefetchSearch() {
  void import("./SearchSheet");
  void loadProcedureIndex();
  void loadHospitalIndex();
}

// The active section is not shown by the fill pill alone (1.1:1 against the
// canvas): it is also semibold and underlined in accent. Text decoration is
// remapped, not removed, in forced-colors mode.
const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-full px-4 text-callout font-medium text-label-2 transition-colors duration-150 hover:text-label data-active:bg-fill data-active:font-semibold data-active:text-label data-active:underline data-active:decoration-accent data-active:decoration-2 data-active:underline-offset-[6px]";

/**
 * Site header (§2.3–2.5, §7). Solid canvas background, no blur; a hairline
 * appears once the page scrolls (IntersectionObserver on a 1px sentinel at the
 * top of the body sets data-scrolled). Focus routes get the service name, the
 * language switch and a Close (X) back to the section hub, with no nav or
 * search. The header search is left out on pages that open with their own
 * search field (lib/nav.ts HERO_SEARCH_ROUTES).
 *
 * `medicinesDate` (the Jan Aushadhi list date) and `medicinesBrands` (the
 * brand MRP source and its licence), both from a server component, are passed
 * to the search sheet for its medicines footnotes.
 */
export default function SiteHeader({
  medicinesDate,
  medicinesBrands,
}: {
  medicinesDate?: string | null;
  medicinesBrands?: MedicinesMeta["brands"] | null;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const focus = focusRouteFor(pathname);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  // The sheet is open for the path it was opened on, so any navigation closes it.
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const sheetOpen = sheetPath !== null && sheetPath === pathname;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  function openSheet() {
    prefetchSearch();
    setSheetLoaded(true);
    setSheetPath(pathname);
  }

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      <header
        id="site-header"
        data-scrolled={scrolled ? "true" : "false"}
        className="sticky top-0 z-40 border-b border-transparent bg-canvas data-[scrolled=true]:border-hairline"
      >
        <div className="mx-auto flex h-14 max-w-page items-center gap-2 px-4 md:px-6">
          {focus ? (
            <>
              <Logo compact />
              <span aria-hidden="true" className="mx-2 h-6 w-px shrink-0 bg-hairline" />
              <span className="min-w-0 truncate text-headline text-label">
                <span className="md:hidden">{t(focus.phoneKey)}</span>
                <span className="hidden md:inline">{t(focus.serviceKey)}</span>
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <LanguageSwitch />
                <IconButton
                  icon="x"
                  href={focus.closeHref}
                  label={t("nav.close", { section: t(focus.closeLabelKey) })}
                />
              </div>
            </>
          ) : (
            <>
              <Logo />
              <nav aria-label={t("nav.mainLabel")} className="ml-4 hidden md:flex md:gap-1">
                {SECTIONS.map((section) => {
                  const current = ariaCurrent(pathname, section.href, section.match);
                  return (
                    <Link
                      key={section.key}
                      href={section.href}
                      aria-current={current}
                      data-active={current ? "" : undefined}
                      className={NAV_LINK}
                    >
                      {t(section.navKey)}
                    </Link>
                  );
                })}
              </nav>
              <div className="ml-auto flex items-center gap-1">
                {!hasHeroSearch(pathname) && (
                  <span className="contents" onPointerEnter={prefetchSearch} onFocus={prefetchSearch}>
                    <IconButton icon="search" label={t("nav.search")} className="lg:hidden" onClick={openSheet} />
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={openSheet}
                      className="hidden h-11 w-64 items-center gap-2 rounded-full border border-control bg-surface px-4 text-callout text-label-2 transition-colors duration-150 hover:bg-fill lg:inline-flex"
                    >
                      <Icon name="search" className="size-5 shrink-0" />
                      <span className="truncate">{t("nav.searchButton")}</span>
                    </button>
                  </span>
                )}
                <LanguageSwitch />
              </div>
            </>
          )}
        </div>
      </header>
      {sheetLoaded && (
        <SearchSheet
          open={sheetOpen}
          onClose={() => setSheetPath(null)}
          medicinesDate={medicinesDate}
          medicinesBrands={medicinesBrands}
        />
      )}
    </>
  );
}
