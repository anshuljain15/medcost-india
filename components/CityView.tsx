"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChipRow, ChoiceChip } from "@/components/ui/ChoiceChip";
import { DataText } from "@/components/ui/DataText";
import { EmptyState } from "@/components/ui/EmptyState";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageNotes } from "@/components/ui/PageNotes";
import { PageShell } from "@/components/ui/PageShell";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SourceNote } from "@/components/ui/SourceNote";
import { TextField } from "@/components/ui/TextField";
import { useAnnounce } from "@/components/ui/LiveRegion";
import { cx } from "@/components/ui/href";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import HospitalMapLoader from "@/components/HospitalMapLoader";

/**
 * One directory row, sliced on the server (app/hospitals/[city]/page.tsx):
 * only what the list and the map show. `beds` is already cleanCount()ed, and
 * `priced` is the server's Bangalore-only "has linked treatment prices".
 */
export type CityHospital = {
  slug: string;
  name: string;
  address: string | null;
  pincode: string | null;
  beds: number | null;
  lat: number | null;
  lon: number | null;
  priced: boolean;
};

type View = "list" | "map";

const PAGE = 50;

// The list + map split starts at 1024px (lg). Below it, the map is mounted
// only when "Map" is chosen; from it, after the browser is idle.
const WIDE_QUERY = "(min-width: 64rem)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const wideNow = () => window.matchMedia(WIDE_QUERY).matches;
const wideOnServer = () => false;

function normalise(s: string): string {
  return s.toLowerCase().normalize("NFC").replace(/\s+/g, " ").trim();
}

export default function CityView({
  cityLabel,
  citySlug,
  hospitals,
  directoryDate,
}: {
  cityLabel: string;
  citySlug: string;
  hospitals: CityHospital[];
  directoryDate: string | null;
}) {
  const { t, cityName } = useTranslation();
  const announce = useAnnounce();
  const [query, setQuery] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [view, setView] = useState<View>("list");
  const [limit, setLimit] = useState(PAGE);
  const [idle, setIdle] = useState(false);
  const isWide = useSyncExternalStore(subscribeWide, wideNow, wideOnServer);
  const listRef = useRef<HTMLDivElement>(null);
  const focusRowRef = useRef<number | null>(null);
  // Set by the filter controls: nothing is announced until someone filters.
  const filteredByUserRef = useRef(false);

  const hasPrices = useMemo(() => hospitals.some((h) => h.priced), [hospitals]);
  const hays = useMemo(
    () => hospitals.map((h) => normalise([h.name, h.address ?? "", h.pincode ?? ""].join(" "))),
    [hospitals]
  );

  const filtered = useMemo(() => {
    const words = normalise(query).split(" ").filter(Boolean);
    return hospitals.filter(
      (h, i) => (!pricedOnly || h.priced) && words.every((w) => hays[i].includes(w))
    );
  }, [hospitals, hays, query, pricedOnly]);

  const visible = filtered.slice(0, limit);
  const remaining = filtered.length - visible.length;
  const unmapped = useMemo(() => filtered.filter((h) => h.lat == null || h.lon == null).length, [filtered]);
  const shownLabel = filtered.length.toLocaleString("en-IN");
  const totalLabel = hospitals.length.toLocaleString("en-IN");

  // The count is announced once typing pauses (600ms, as on every other
  // filter), not on each keystroke; the footnote under the field is not live.
  useEffect(() => {
    if (!filteredByUserRef.current) return;
    const timer = window.setTimeout(() => {
      announce(
        filtered.length === 0 ? t("city.noMatch") : t("city.showing", { shown: shownLabel, total: totalLabel })
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [query, pricedOnly, filtered.length, shownLabel, totalLabel, announce, t]);

  // From 1024px the map shares the screen with the list; it waits for an idle
  // moment so the list is usable first on a slow phone or laptop.
  useEffect(() => {
    if (!isWide || idle) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setIdle(true), 300);
    return () => window.clearTimeout(id);
  }, [isWide, idle]);
  const mountMap = view === "map" || (isWide && idle);

  // "Show more" moves focus to the first newly shown row, so keyboard and
  // screen-reader users continue where the list grew.
  useEffect(() => {
    const index = focusRowRef.current;
    if (index === null) return;
    focusRowRef.current = null;
    listRef.current?.querySelectorAll<HTMLAnchorElement>("li > a")[index]?.focus();
  }, [limit]);

  function showMore() {
    focusRowRef.current = visible.length;
    setLimit((n) => n + PAGE);
  }

  // The no-match state's next step: back to the whole city, focus in the field.
  function clearFilters() {
    filteredByUserRef.current = true;
    setQuery("");
    setPricedOnly(false);
    setLimit(PAGE);
    document.getElementById("city-filter")?.focus();
  }

  return (
    <PageShell width="page">
      <PageHeader
        back={{ href: "/hospitals", label: t("nav.findHospital") }}
        title={t("city.title", { city: cityName(cityLabel) })}
        lead={t("city.subtitle", { n: hospitals.length.toLocaleString("en-IN") })}
      />

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="lg:col-span-5">
          <div className="space-y-4">
            <TextField
              id="city-filter"
              type="search"
              label={t("city.searchLabel")}
              value={query}
              autoComplete="off"
              enterKeyHint="search"
              // Below 768px the field moves under the header on focus, so the
              // list fills the space above the keyboard; Search closes it.
              phoneSearch
              onChange={(e) => {
                filteredByUserRef.current = true;
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
            />
            {hasPrices && (
              <ChipRow wrap>
                <ChoiceChip
                  type="toggle"
                  checked={pricedOnly}
                  onChange={(on) => {
                    filteredByUserRef.current = true;
                    setPricedOnly(on);
                    setLimit(PAGE);
                  }}
                >
                  {t("city.filterPrices")}
                </ChoiceChip>
              </ChipRow>
            )}
            <div className="lg:hidden">
              <SegmentedControl<View>
                name="city-view"
                legend={t("city.viewLabel")}
                legendHidden
                options={[
                  { value: "list", label: t("city.viewList") },
                  { value: "map", label: t("city.viewMap") },
                ]}
                value={view}
                onChange={setView}
              />
            </div>
            <div className="space-y-1">
              <p className="text-footnote text-label-2">
                {t("city.showing", { shown: shownLabel, total: totalLabel })}
                {" · "}
                {t("city.sortNote")}
              </p>
              {/* Honest about the ~1% of rows whose coordinates couldn't be repaired. */}
              {unmapped > 0 && (
                <p className={cx("text-footnote text-label-2", view !== "map" && "hidden lg:block")}>
                  {t(unmapped === 1 ? "city.notOnMapOne" : "city.notOnMap", { n: unmapped })}
                </p>
              )}
            </div>
          </div>

          {/* One page-level list: no nested scroll. Hidden (not unmounted) while the phone map is up. */}
          <div ref={listRef} className={cx("mt-4", view === "map" && "hidden lg:block")}>
            {filtered.length === 0 ? (
              <EmptyState
                icon="search"
                title={t("city.noMatch")}
                action={{ onClick: clearFilters, label: t("city.clearFilters") }}
              />
            ) : (
              <>
                <InsetGroup>
                  {visible.map((h) => (
                    <ListRow
                      key={h.slug}
                      href={`/hospitals/${citySlug}/${h.slug}`}
                      // Prefetch on intent only: viewport prefetch would warm up to
                      // 50 hospital pages per screenful while scrolling the list.
                      prefetch="intent"
                      title={<DataText>{h.name}</DataText>}
                      subtitle={
                        h.address ? (
                          <span className="block truncate">
                            <DataText>{h.address}</DataText>
                          </span>
                        ) : undefined
                      }
                      meta={rowMeta(h, t) || undefined}
                      // Neutral: teal is for pressable things only, and a badge isn't one.
                      badges={h.priced ? <Badge icon="clipboard">{t("city.pricesBadge")}</Badge> : undefined}
                    />
                  ))}
                </InsetGroup>
                {remaining > 0 && (
                  <div className="mt-4">
                    <Button variant="tonal" block onClick={showMore}>
                      {t("common.showMore", { n: Math.min(PAGE, remaining) })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Explicit height in both layouts: MapLibre needs a sized container.
            The map canvas is a keyboard stop (arrow keys pan), but its own ring
            is clipped by overflow-hidden, so this wrapper draws it (TaskTile recipe). */}
        <div className={cx("mt-4 lg:sticky lg:top-[72px] lg:col-span-7 lg:mt-0", view !== "map" && "hidden lg:block")}>
          <div className="h-[70dvh] min-h-[360px] overflow-hidden rounded-card bg-fill has-[.maplibregl-canvas:focus-visible]:outline-3 has-[.maplibregl-canvas:focus-visible]:outline-offset-2 has-[.maplibregl-canvas:focus-visible]:outline-focus lg:h-[calc(100dvh-96px)]">
            {mountMap && <HospitalMapLoader hospitals={filtered} citySlug={citySlug} />}
          </div>
        </div>
      </div>

      <PageNotes anchor="hospitals">
        <SourceNote compact source={t("source.directory")} date={directoryDate} anchor="hospitals" />
      </PageNotes>
    </PageShell>
  );
}

function rowMeta(h: CityHospital, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (h.pincode) parts.push(t("city.pin", { pin: h.pincode }));
  if (h.beds !== null) parts.push(t("city.beds", { n: h.beds.toLocaleString("en-IN") }));
  return parts.join(" · ");
}
