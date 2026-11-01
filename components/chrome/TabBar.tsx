"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { SECTIONS, ariaCurrent, focusRouteFor } from "@/lib/nav";

// Home is active on "/" only; each section also covers its tools (lib/nav.ts).
const TABS: { key: string; href: string; tabKey: string; icon: IconName; match: string[] }[] = [
  { key: "home", href: "/", tabKey: "tab.home", icon: "home", match: [] },
  ...SECTIONS.map(({ key, href, tabKey, icon, match }) => ({ key, href, tabKey, icon, match })),
];

// The active tab is marked three ways, never by colour alone: accent colour,
// semibold (500 -> 600) and a 3px bar along its top edge. The bar is a
// border, not a background, so it survives forced-colors mode.
const TAB =
  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-medium text-label-2 data-active:font-semibold data-active:text-accent data-active:before:absolute data-active:before:inset-x-5 data-active:before:top-0 data-active:before:rounded-b-full data-active:before:border-t-[3px] data-active:before:border-accent";

/**
 * Phones only (<768px): 4 equal tabs with labels always visible (§2.4, §7).
 * Not rendered on focus routes. `data-tabbar` lets globals.css pad the body
 * for it and hide it while a text field has focus (no JS).
 */
export default function TabBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  if (focusRouteFor(pathname)) return null;
  return (
    <nav
      aria-label={t("nav.tabsLabel")}
      data-tabbar=""
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => {
        const current = ariaCurrent(pathname, tab.href, tab.match);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={current}
            data-active={current ? "" : undefined}
            className={TAB}
          >
            <Icon name={tab.icon} className="size-6" />
            <span>{t(tab.tabKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
