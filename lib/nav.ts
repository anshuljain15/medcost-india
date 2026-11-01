import type { IconName } from "@/components/ui/Icon";

// The site's three sections and its focus routes, shared by the header, the
// tab bar, the footer and the 404 page (design spec §2.1, §2.5, §2.8). Labels
// are translation keys; every href is a plain path (next/link adds basePath).

export type SectionKey = "treatment" | "medicines" | "hospitals";

export const SECTIONS: {
  key: SectionKey;
  href: string;
  navKey: string;
  tabKey: string;
  icon: IconName;
  match: string[];
}[] = [
  { key: "treatment", href: "/procedures", navKey: "nav.treatment", tabKey: "tab.treatment", icon: "clipboard", match: ["/procedures", "/check-quote", "/rates"] },
  { key: "medicines", href: "/medicines", navKey: "nav.medicines", tabKey: "tab.medicines", icon: "pill", match: ["/medicines", "/check-bill", "/kendras"] },
  { key: "hospitals", href: "/hospitals", navKey: "nav.hospitals", tabKey: "tab.hospitals", icon: "hospital", match: ["/hospitals"] },
];

/**
 * Focus mode: no section nav, search or tab bar; the header shows the service
 * name and a Close (X). Below 768px the header has about 130px for the name
 * (after the logo mark, language pill and Close), so it shows `phoneKey`, a
 * two-word name; the full `serviceKey` shows from 768px. The H1 under the
 * header always carries the full name.
 */
export const FOCUS_ROUTES: Record<string, { serviceKey: string; phoneKey: string; closeHref: string; closeLabelKey: string }> = {
  "/check-quote": { serviceKey: "nav.checkQuoteShort", phoneKey: "nav.phoneCheckQuote", closeHref: "/procedures", closeLabelKey: "nav.treatment" },
  "/check-bill":  { serviceKey: "nav.checkBill",       phoneKey: "nav.phoneCheckBill",  closeHref: "/medicines",  closeLabelKey: "nav.medicines" },
  "/share-bill":  { serviceKey: "nav.shareBill",       phoneKey: "nav.phoneShareBill",  closeHref: "/",           closeLabelKey: "nav.home" },
};

/**
 * Routes whose page opens with its own search field (the home hero, and the
 * hospital search on /hospitals). The header leaves its search out there, so
 * a screen never shows two search fields with different scopes.
 */
export const HERO_SEARCH_ROUTES = ["/", "/hospitals"];

/** True when the page at `pathname` has its own hero search. */
export function hasHeroSearch(pathname: string): boolean {
  return HERO_SEARCH_ROUTES.includes(stripTrailingSlash(pathname));
}

/** "/procedures/" -> "/procedures"; "/" stays "/". */
function stripTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.replace(/\/+$/, "") || "/" : path;
}

/** The focus-route config for a pathname (trailing slash tolerated), or undefined. */
export function focusRouteFor(pathname: string) {
  return FOCUS_ROUTES[stripTrailingSlash(pathname)];
}

/**
 * aria-current for a nav link: "page" on an exact match with `href`, "true"
 * when the path is inside one of the section's `match` prefixes, else
 * undefined. Pair it with `data-active` for styling.
 */
export function ariaCurrent(pathname: string, href: string, match: string[]): "page" | "true" | undefined {
  const path = stripTrailingSlash(pathname);
  if (path === stripTrailingSlash(href)) return "page";
  return match.some((m) => {
    const prefix = stripTrailingSlash(m);
    return prefix !== "/" && (path === prefix || path.startsWith(`${prefix}/`));
  })
    ? "true"
    : undefined;
}

/**
 * Where people report a wrong price or detail, e.g.
 * "https://github.com/anshuljain15/medcost-india/issues". null until the owner
 * confirms the repo is public with Issues enabled (design spec §6
 * /methodology, "Corrections link"). While it is null, the footer's "Report a
 * wrong price" row (nav.reportMistake) and the methodology.correctionsLink
 * under #corrections are not shown: a link that leads only to a promise of a
 * channel is worse than no link. Set it, and both appear.
 */
export const CORRECTIONS_URL: string | null = null;
