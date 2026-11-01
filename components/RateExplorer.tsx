"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  Button,
  Callout,
  DataText,
  Disclosure,
  EmptyState,
  InsetGroup,
  ListRow,
  Money,
  PageHeader,
  PageNotes,
  PageShell,
  SegmentedControl,
  Select,
  Skeleton,
  SourceNote,
  Table,
  TableCell,
  TextField,
  useAnnounce,
} from "@/components/ui";
import { cghsGst, parseCghsAmount } from "@/lib/format";
import { loadCghsIndex, type CghsIndex, type CghsIndexRow } from "@/lib/staticData";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

const PAGE_SIZE = 50;

type HospitalType = "nabh" | "nonNabh";

/** Ward columns of a CghsIndexRow: [label key, column index]. */
const WARD_COLUMNS: [labelKey: string, col: 4 | 5 | 6][] = [
  ["rates.colGeneral", 4],
  ["rates.colSemiPrivate", 5],
  ["rates.colPrivate", 6],
];

const fmtCount = (n: number) => n.toLocaleString("en-IN");

// The table replaces the phone list from 768px. Only one of them is rendered,
// so each keystroke formats one set of rows, not two.
const WIDE_QUERY = "(min-width: 48rem)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const wideNow = () => window.matchMedia(WIDE_QUERY).matches;
const wideOnServer = () => false;

/**
 * One CGHS ward amount, with its GST note when the list gives one.
 * parseCghsAmount reads "38740+GST" and "Rs 23,625(Inclusive of GST)" as bare
 * numbers; cghsGst says which it was, so a "+GST" rate never passes for the
 * full amount and never looks the same as a GST-inclusive one.
 */
function WardAmount({ raw }: { raw: string | null }) {
  const { t } = useTranslation();
  const gst = cghsGst(raw);
  return (
    <>
      <Money value={parseCghsAmount(raw)} />
      {gst && (
        <span className="block text-footnote text-label-2">
          {t(gst === "plus" ? "common.plusGst" : "common.inclGst")}
        </span>
      )}
    </>
  );
}

/** Phone layout: name, code, then the three ward amounts in a row. */
function RateRow({ row }: { row: CghsIndexRow }) {
  const { t } = useTranslation();
  return (
    <ListRow
      title={<DataText>{row[1]}</DataText>}
      meta={
        <>
          <span>{t("rates.codeLabel", { code: row[0] })}</span>
          <dl className="mt-2 grid grid-cols-3 gap-2">
            {WARD_COLUMNS.map(([key, col]) => (
              <div key={key}>
                <dt className="text-footnote text-label-2">{t(key)}</dt>
                <dd className="text-headline tabular-nums text-label">
                  <WardAmount raw={row[col]} />
                </dd>
              </div>
            ))}
          </dl>
        </>
      }
    />
  );
}

/**
 * /rates: search-first explorer over the CGHS Tier I list. The rows are
 * fetched once, as static JSON, on the first focus of the search field or the
 * specialty picker; nothing is listed until there is a query or a specialty.
 */
export default function RateExplorer({
  lineItems,
  specialties,
  date,
  sourceUrl,
}: {
  /** Distinct CGHS codes (each listed at a NABH and a non-NABH rate). */
  lineItems: number;
  specialties: string[];
  /** CGHS retrieval date; null renders "date not recorded", never a guess. */
  date: string | null;
  /** The CGHS rate list URL recorded in data-pipeline/sources/cghs.py. */
  sourceUrl: string;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [type, setType] = useState<HospitalType>("nabh");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [index, setIndex] = useState<CghsIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const isWide = useSyncExternalStore(subscribeWide, wideNow, wideOnServer);

  /** Fetch the index on first use (event handlers only). A failed fetch is retried on the next focus. */
  function ensureIndex() {
    if (index || loading.current) return;
    loading.current = true;
    setFailed(false);
    loadCghsIndex().then((idx) => {
      loading.current = false;
      if (idx.r.length > 0) setIndex(idx);
      else setFailed(true);
    });
  }

  // Typing stays responsive while the filter over ~2,600 rows catches up.
  const deferredQuery = useDeferredValue(query);
  const trimmed = deferredQuery.trim();
  const active = trimmed !== "" || specialty !== "";

  // "code name", lower-cased once per index rather than once per keystroke.
  const hays = useMemo(
    () => (index ? index.r.map((r) => `${r[0]} ${r[1]}`.toLowerCase().normalize("NFC")) : []),
    [index]
  );

  const filtered = useMemo(() => {
    if (!index || !active) return [];
    const tokens = trimmed.toLowerCase().normalize("NFC").split(/\s+/).filter(Boolean);
    const nabh = type === "nabh" ? 1 : 0;
    const specialtyIndex = specialty ? index.s.indexOf(specialty) : -1;
    return index.r.filter((r, i) => {
      if (r[3] !== nabh) return false;
      if (specialty && r[2] !== specialtyIndex) return false;
      return tokens.every((tok) => hays[i].includes(tok));
    });
  }, [index, hays, active, trimmed, specialty, type]);

  const shown = filtered.slice(0, visible);
  const ready = index !== null && active;
  const matchingText = t(filtered.length === 1 ? "rates.matchingRowsOne" : "rates.matchingRows", {
    n: fmtCount(filtered.length),
  });

  // Announce the number of matching rows once typing or picking pauses.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => announce(matchingText), 600);
    return () => window.clearTimeout(timer);
  }, [ready, matchingText, announce]);

  let results: React.ReactNode;
  if (!active) {
    results = <EmptyState icon="search" title={t("rates.promptSearch", { n: fmtCount(lineItems) })} />;
  } else if (failed) {
    results = (
      <Callout tone="info">
        <p>{t("rates.loadFailed")}</p>
      </Callout>
    );
  } else if (!index) {
    results = (
      <div className="space-y-2">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  } else {
    results = (
      <>
        <p className="text-footnote text-label-2">{matchingText}</p>
        {filtered.length > 0 && (
          <>
            {isWide ? (
              <div className="mt-3 rounded-card bg-surface p-2">
                <Table
                  caption={t("rates.title")}
                  columns={[
                    { key: "code", label: t("rates.colCode") },
                    { key: "name", label: t("rates.colProcedure") },
                    { key: "general", label: t("rates.colGeneral"), numeric: true },
                    { key: "semi", label: t("rates.colSemiPrivate"), numeric: true },
                    { key: "private", label: t("rates.colPrivate"), numeric: true },
                  ]}
                >
                  {shown.map((r, i) => (
                    <tr key={`${r[0]}-${r[3]}-${i}`}>
                      <TableCell>
                        <span className="whitespace-nowrap tabular-nums">
                          <DataText>{r[0]}</DataText>
                        </span>
                      </TableCell>
                      <TableCell>
                        <DataText>{r[1]}</DataText>
                      </TableCell>
                      {WARD_COLUMNS.map(([key, col]) => (
                        <TableCell key={key} numeric>
                          <WardAmount raw={r[col]} />
                        </TableCell>
                      ))}
                    </tr>
                  ))}
                </Table>
              </div>
            ) : (
              <div className="mt-3 max-w-read">
                <InsetGroup>
                  {shown.map((r, i) => (
                    <RateRow key={`${r[0]}-${r[3]}-${i}`} row={r} />
                  ))}
                </InsetGroup>
              </div>
            )}
            {visible < filtered.length && (
              <div className="mt-6">
                <Button variant="tonal" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  {t("common.showMore", { n: fmtCount(Math.min(PAGE_SIZE, filtered.length - visible)) })}
                </Button>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <PageShell width="page">
      <div className="max-w-read">
        <PageHeader
          back={{ href: "/procedures", label: t("procedure.back") }}
          title={t("rates.title")}
          lead={t("rates.lead")}
        />

        {/* -mx-4 lines the summary text up with the H1 (the summary has px-4). */}
        <div className="-mx-4">
          <Disclosure variant="inline" summary={t("rates.about")}>
            <p>{t("rates.subtitle", { n: fmtCount(lineItems), m: specialties.length })}</p>
          </Disclosure>
        </div>

        <div className="mt-6 space-y-6">
          <TextField
            id="rates-search"
            type="search"
            label={t("rates.searchLabel")}
            placeholder={t("rates.searchPlaceholder")}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            // Below 768px the field moves under the header on focus, and the
            // keyboard's Search key closes the keyboard (TextField does both);
            // here Search also brings the results, below the filters, into view.
            phoneSearch
            onFocus={ensureIndex}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isWide) resultsRef.current?.scrollIntoView({ block: "start" });
            }}
            onChange={(e) => {
              ensureIndex();
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
          />
          <Select
            id="rates-specialty"
            label={t("rates.specialtyLabel")}
            value={specialty}
            onFocus={ensureIndex}
            onChange={(e) => {
              ensureIndex();
              setSpecialty(e.target.value);
              setVisible(PAGE_SIZE);
            }}
          >
            <option value="">{t("rates.allSpecialties")}</option>
            {specialties.map((s) => (
              <option key={s} value={s} translate="no">
                {s}
              </option>
            ))}
          </Select>
          <SegmentedControl<HospitalType>
            name="rates-hospital-type"
            legend={t("rates.hospitalType")}
            options={[
              { value: "nabh", label: t("rates.nabh") },
              { value: "nonNabh", label: t("rates.nonNabh") },
            ]}
            value={type}
            onChange={(v) => {
              setType(v);
              setVisible(PAGE_SIZE);
            }}
          />
        </div>

        <div className="-mx-4 mt-4">
          <Disclosure variant="inline" summary={t("rates.whatNabh")}>
            <p>{t("rates.whatNabhBody")}</p>
          </Disclosure>
        </div>
      </div>

      <div
        ref={resultsRef}
        className="mt-6 md:mt-10"
        aria-busy={active && !index && !failed ? true : undefined}
      >
        {results}
      </div>

      {/* compact: PageNotes already ends with the "How we get prices" link. */}
      <PageNotes anchor="govt-rates">
        <SourceNote
          source={new URL(sourceUrl).hostname}
          href={sourceUrl}
          qualifier={t("source.cghs")}
          date={date}
          anchor="govt-rates"
          compact
        />
      </PageNotes>
    </PageShell>
  );
}
