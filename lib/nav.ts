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

/** Focus mode: no section nav, search or tab bar; the header shows the service name and a Close (X). */
export const FOCUS_ROUTES: Record<string, { serviceKey: string; closeHref: string; closeLabelKey: string }> = {
  "/check-quote": { serviceKey: "nav.checkQuoteShort", closeHref: "/procedures", closeLabelKey: "nav.treatment" },
  "/check-bill":  { serviceKey: "nav.checkBill",       closeHref: "/medicines",  closeLabelKey: "nav.medicines" },
  "/share-bill":  { serviceKey: "nav.shareBill",       closeHref: "/",           closeLabelKey: "nav.home" },
};

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
