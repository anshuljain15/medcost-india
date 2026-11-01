"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { JanAushadhiKendra } from "@/lib/types";
import { findKendras } from "@/lib/medicineShards";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  ActionLink,
  Badge,
  Button,
  Callout,
  DataText,
  ExtLink,
  IconButton,
  InsetGroup,
  ListRow,
  PageHeader,
  PageNotes,
  PageShell,
  PinField,
  Skeleton,
  useAnnounce,
} from "@/components/ui";

// Jan Aushadhi stores by PIN. The store list has no coordinates, so results
// are the same PIN first, then the rest of the 3-digit postal area by PIN
// number (lib/medicineShards.ts findKendras). We never claim a distance, and
// the operator's personal name is not in the data at all.

const PIN_RE = /^[1-9]\d{5}$/;
const OFFICIAL_LOCATOR = "https://janaushadhi.gov.in";
/** Rows shown by the compact finder on a medicine page before "See all stores". */
const COMPACT_ROWS = 5;
/**
 * /kendras shows this many rows first, then adds MORE_ROWS per "Show more".
 * A postal area can hold 761 stores (110xxx); rendering them all at once is
 * one long main-thread task and a page about 75,000px tall on a low-end phone.
 * Same-PIN stores sort first, so they are always in the first page.
 */
const FIRST_ROWS = 20;
const MORE_ROWS = 50;

/** /kendras: the full page. ?pin= is read inside a Suspense boundary (static export needs one). */
export default function KendraFinder({ snapshotDate, total }: { snapshotDate: string | null; total: number }) {
  const { t, formatDate } = useTranslation();
  // The ?pin= deep link arrives after hydration; keying the lookup on it
  // starts a fresh search for that PIN without syncing state in an effect.
  const [urlPin, setUrlPin] = useState("");
  // The PIN this page last searched and wrote to the URL itself. Its own URL
  // update must not re-key (remount) the lookup: that would move focus off the
  // submit button, flash the skeletons and announce the results twice.
  const searched = useRef("");

  const onUrlPin = useCallback((pin: string) => {
    if (pin !== searched.current) setUrlPin(pin);
  }, []);

  // Keep the searched PIN in the URL (replace, not push), so a reload, a shared
  // link or coming Back to /kendras shows the same stores. The native history
  // API is integrated with the App Router (useSearchParams follows it; pass
  // null so Next.js keeps its own history state) and, unlike router.replace,
  // needs no round trip for the page payload.
  const onSearch = useCallback((pin: string) => {
    searched.current = pin;
    window.history.replaceState(null, "", `?pin=${pin}`);
  }, []);

  return (
    <PageShell>
      <PageHeader back={{ href: "/medicines", label: t("medicines.back") }} title={t("kendras.title")} lead={t("kendras.lead")} />
      <Suspense fallback={null}>
        <PinFromUrl onPin={onUrlPin} />
      </Suspense>
      <KendraLookup key={urlPin} initialPin={urlPin} idPrefix="kendras" onSearch={onSearch} />
      <PageNotes anchor="stores">
        <p>
          {t("kendras.source", {
            date: snapshotDate ? formatDate(snapshotDate) : t("source.noDate"),
            n: total.toLocaleString("en-IN"),
          })}
        </p>
      </PageNotes>
    </PageShell>
  );
}

function PinFromUrl({ onPin }: { onPin: (pin: string) => void }) {
  const pin = (useSearchParams().get("pin") ?? "").replace(/\D/g, "").slice(0, 6);
  useEffect(() => {
    if (pin) onPin(pin);
  }, [pin, onPin]);
  return null;
}

/**
 * PinField + "Find stores" + results. `compact` (the medicine page) shows the
 * first few rows and links to /kendras?pin= for the rest; the full page adds
 * the "Before you travel" callout directly above the results and pages the
 * list. `onSearch` is called with each valid PIN submitted (the full page
 * writes it to the URL; the compact finder must not touch the medicine URL).
 */
export function KendraLookup({
  initialPin = "",
  compact = false,
  idPrefix,
  onSearch,
}: {
  initialPin?: string;
  compact?: boolean;
  idPrefix: string;
  onSearch?: (pin: string) => void;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const fieldId = `${idPrefix}-pin`;
  const [input, setInput] = useState(initialPin);
  const [pin, setPin] = useState(PIN_RE.test(initialPin) ? initialPin : "");
  const [invalid, setInvalid] = useState(false);
  const [results, setResults] = useState<{ for: string; kendras: JanAushadhiKendra[] }>({ for: "", kendras: [] });
  const [limit, setLimit] = useState(FIRST_ROWS);
  const listRef = useRef<HTMLDivElement>(null);
  const focusRow = useRef<number | null>(null);

  useEffect(() => {
    if (!pin) return;
    let cancelled = false;
    findKendras(pin).then((kendras) => {
      if (cancelled) return;
      setResults({ for: pin, kendras });
      const area = pin.slice(0, 3);
      announce(
        kendras.length > 0
          ? t(kendras.length === 1 ? "kendras.resultsOne" : "kendras.results", { n: kendras.length, area })
          : t("kendras.none", { area })
      );
    });
    return () => {
      cancelled = true;
    };
  }, [pin, announce, t]);

  // "Show more" moves focus to the first newly shown row (its directions
  // link, the row's only control), so keyboard and screen-reader users carry
  // on where the list grew (the CityView pattern).
  useEffect(() => {
    const index = focusRow.current;
    if (index === null) return;
    focusRow.current = null;
    listRef.current?.querySelectorAll<HTMLAnchorElement>("li a")[index]?.focus();
  }, [limit]);

  const ready = pin !== "" && results.for === pin;
  const area = pin.slice(0, 3);
  const shown = results.kendras.slice(0, compact ? COMPACT_ROWS : limit);
  const remaining = compact ? 0 : results.kendras.length - shown.length;
  const ResultsHeading = compact ? "h3" : "h2";

  return (
    <div>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (PIN_RE.test(input)) {
            setInvalid(false);
            setPin(input);
            setLimit(FIRST_ROWS);
            onSearch?.(input);
          } else {
            setInvalid(true);
            document.getElementById(fieldId)?.focus();
          }
        }}
      >
        <PinField
          id={fieldId}
          label={t("kendras.pinLabel")}
          hint={t("kendras.pinHint")}
          error={invalid ? t("kendras.invalidPin") : undefined}
          value={input}
          onValueChange={(v) => {
            setInput(v);
            if (invalid && PIN_RE.test(v)) setInvalid(false);
          }}
        />
        <Button type="submit" block icon="search">
          {t("kendras.search")}
        </Button>
      </form>

      {pin && (
        <div className="mt-8 space-y-4">
          {!compact && (
            <Callout title={t("kendras.beforeTravel")}>
              <p>
                {t("kendras.verify")} <ExtLink href={OFFICIAL_LOCATOR}>{t("kendras.official")}</ExtLink>
              </p>
              <p>{t("kendras.coverageGap")}</p>
            </Callout>
          )}

          {!ready ? (
            <div aria-hidden="true" className="space-y-2">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <>
              <ResultsHeading className="text-headline text-label">
                {results.kendras.length > 0
                  ? t(results.kendras.length === 1 ? "kendras.resultsOne" : "kendras.results", {
                      n: results.kendras.length,
                      area,
                    })
                  : t("kendras.none", { area })}
              </ResultsHeading>
              {shown.length > 0 && (
                <div ref={listRef}>
                  <InsetGroup>
                    {shown.map((k) => (
                      <KendraRow key={k.code} kendra={k} samePin={k.pincode === pin} />
                    ))}
                  </InsetGroup>
                </div>
              )}
              {remaining > 0 && (
                <Button
                  variant="tonal"
                  block
                  onClick={() => {
                    focusRow.current = shown.length;
                    setLimit((n) => n + MORE_ROWS);
                  }}
                >
                  {t("common.showMore", { n: Math.min(MORE_ROWS, remaining) })}
                </Button>
              )}
              {compact && (
                <>
                  {results.kendras.length > 0 && (
                    <ActionLink href={`/kendras?pin=${pin}`}>{t("medicines.seeAllStores", { area })}</ActionLink>
                  )}
                  <p className="text-footnote text-label-2">
                    {t("kendras.verify")} <ExtLink href={OFFICIAL_LOCATOR}>{t("kendras.official")}</ExtLink>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One store (an InsetGroup row). Also used by the hospital page, which passes
 * `samePin={false}`. The address is data text; the directions button opens a
 * Google Maps address search, which makes no distance claim of its own.
 */
export function KendraRow({
  kendra,
  samePin,
  samePinLabel,
}: {
  kendra: JanAushadhiKendra;
  samePin: boolean;
  samePinLabel?: string;
}) {
  const { t } = useTranslation();
  const place = [kendra.district, kendra.state].filter(Boolean).join(", ");
  const title = kendra.address ?? place;
  const query = [kendra.address, place, kendra.pincode].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  // When there is no address the title already is "district, state".
  const subPlace = kendra.address && place ? place : null;

  return (
    <ListRow
      title={<DataText>{title}</DataText>}
      subtitle={
        subPlace || kendra.pincode ? (
          <>
            {subPlace && <DataText>{subPlace}</DataText>}
            {subPlace && kendra.pincode && " · "}
            {kendra.pincode && <span className="tabular-nums">{t("city.pin", { pin: kendra.pincode })}</span>}
          </>
        ) : undefined
      }
      meta={t("kendras.storeCode", { code: kendra.code })}
      badges={samePin ? <Badge>{samePinLabel || t("kendras.samePin")}</Badge> : undefined}
      trailing={
        // A new tab, so the store list (and a typed PIN) is still here on the way back.
        <IconButton icon="directions" label={`${t("common.directions")}: ${title}`} href={mapsUrl} external />
      }
    />
  );
}
