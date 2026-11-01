"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ExtLink, INLINE_LINK_CLASS } from "@/components/ui/InlineLink";
import { NewTabNote } from "@/components/ui/NewTabNote";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { cx } from "@/components/ui/href";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { MEDICINE_DATA_LICENCE_URL } from "@/lib/medicineShards";
import { CORRECTIONS_URL, focusRouteFor } from "@/lib/nav";
import Logo from "./Logo";

const LINK = "flex min-h-11 items-center hover:text-label hover:underline underline-offset-4";

// The creator credit (kept, §9.1).
const CREDIT_HREF = "https://github.com/anshuljain15";

// The six directory cities, in the spec's order, by URL slug. Their names come
// from cities.* (in Devanagari under Hindi), like the city pages' titles.
const CITIES = ["bangalore", "delhi", "mumbai", "chennai", "hyderabad", "pune"];

/** Stand-in for {licence}, so the licence name can be a link inside the sentence. */
const MARK = "\u0000";

type FooterLink = { href: string; label: React.ReactNode; external?: boolean };

// Plain divs, not <section>s: four extra region landmarks would only add noise
// inside the contentinfo landmark. The h2s still give heading navigation.
function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 className="text-footnote font-semibold text-label">{title}</h2>
      <ul className="mt-1">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                {link.label}
                <Icon name="external" className="ml-1 size-4 shrink-0" />
                <NewTabNote />
              </a>
            ) : (
              // No viewport prefetch: footer links are rarely the next tap, and
              // the city pages carry their whole hospital list as props.
              <Link href={link.href} prefetch={false} className={LINK}>
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Site footer (§2.6, §7): logo + the tagline promise, four link columns that
 * reach all 14 routes, the Appearance switch and the fine print. Focus routes
 * get one slim block: the fine print and "How we get prices".
 */
export default function SiteFooter() {
  const pathname = usePathname();
  const { t, cityName } = useTranslation();

  // CC BY-SA 4.0 asks for a link to the licence, not just its name.
  const [licenceBefore, licenceAfter = ""] = t("footer.licence", { licence: MARK }).split(MARK);
  const finePrint = (
    <>
      <p>{t("footer.notAdvice")}</p>
      <p>{t("footer.emergency")}</p>
      <p>
        {licenceBefore}
        <ExtLink href={MEDICINE_DATA_LICENCE_URL}>CC BY-SA 4.0</ExtLink>
        {licenceAfter}
      </p>
    </>
  );

  if (focusRouteFor(pathname)) {
    return (
      <footer id="site-footer" className="mt-16 border-t border-hairline bg-canvas">
        {/* Room for a StickyActionBar comes from the body (app/globals.css),
            only on screens that render one. */}
        <div className="mx-auto max-w-page px-4 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-callout text-label-2 md:px-6 md:pb-6">
          <div className="space-y-2 text-footnote">
            {finePrint}
            <p>
              <Link
                href="/methodology"
                prefetch={false}
                className={cx(INLINE_LINK_CLASS, "inline-flex min-h-11 items-center")}
              >
                {t("nav.methodology")}
              </Link>
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer id="site-footer" className="mt-16 border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-page px-4 py-10 text-callout text-label-2 md:px-6">
        <div className="flex">
          <Logo />
        </div>
        <p className="mt-3 max-w-[52ch]">{t("footer.tagline")}</p>

        <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <FooterColumn
            title={t("footer.colTreatment")}
            links={[
              { href: "/procedures", label: t("nav.procedures") },
              { href: "/check-quote", label: t("nav.checkQuote") },
              { href: "/rates", label: t("nav.rates") },
            ]}
          />
          <FooterColumn
            title={t("footer.colMedicines")}
            links={[
              { href: "/medicines", label: t("nav.searchMedicines") },
              { href: "/check-bill", label: t("nav.checkBill") },
              { href: "/kendras", label: t("nav.kendras") },
            ]}
          />
          <FooterColumn
            title={t("footer.colHospitals")}
            links={[
              { href: "/hospitals", label: t("nav.findHospital") },
              ...CITIES.map((city) => ({ href: `/hospitals/${city}`, label: cityName(city) })),
            ]}
          />
          <FooterColumn
            title={t("footer.colAbout")}
            links={[
              { href: "/methodology", label: t("nav.methodology") },
              { href: "/share-bill", label: t("nav.shareBill") },
              // Only once there is a working channel to report through (lib/nav.ts).
              ...(CORRECTIONS_URL ? [{ href: "/methodology#corrections", label: t("nav.reportMistake") }] : []),
              { href: CREDIT_HREF, label: t("footer.credit"), external: true },
            ]}
          />
        </div>

        <div className="mt-8 max-w-xs">
          <ThemeSwitch />
        </div>

        <div className="mt-8 space-y-2 border-t border-hairline pt-6 text-footnote">{finePrint}</div>
      </div>
    </footer>
  );
}
