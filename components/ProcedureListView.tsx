"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionLink,
  DataText,
  EmptyState,
  InsetGroup,
  ListRow,
  MoneyRange,
  PageHeader,
  PageNotes,
  PageShell,
  SourceNote,
  TaskTile,
  TextField,
  useAnnounce,
} from "@/components/ui";
import { prepare, prepareQuery, scoreBest, type Prepared } from "@/components/search/match";
import { GROUP_ORDER, procedureGroup, type GroupKey } from "@/lib/procedureGroups";
import { synonymsFor } from "@/lib/search/synonyms";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** One slim row per procedure, built by the server page: [slug, name, low, high, hospital prices, has a CGHS match]. */
export type ProcedureListRow = [
  slug: string,
  name: string,
  low: number | null,
  high: number | null,
  hospitalCount: number,
  hasCghs: boolean,
];

/** The HexaHealth site, for SourceNotes that cover many procedures at once. */
export const HEXAHEALTH_URL = "https://www.hexahealth.com";

/** Display group headings (lib/procedureGroups.ts). Literal keys, so the i18n check can see them. */
export const GROUP_LABEL_KEY: Record<GroupKey, string> = {
  heart: "procedures.group.heart",
  bones: "procedures.group.bones",
  eye: "procedures.group.eye",
  stomach: "procedures.group.stomach",
  weightLoss: "procedures.group.weightLoss",
  women: "procedures.group.women",
  kidney: "procedures.group.kidney",
  cancer: "procedures.group.cancer",
  general: "procedures.group.general",
  entLungs: "procedures.group.entLungs",
  cosmetic: "procedures.group.cosmetic",
  other: "procedures.group.other",
};

const byName = (a: ProcedureListRow, b: ProcedureListRow) => a[1].localeCompare(b[1], "en");

function ProcedureRow({ row }: { row: ProcedureListRow }) {
  const { t } = useTranslation();
  const [slug, name, low, high, hospitalCount, hasCghs] = row;
  const meta = [hospitalCount > 0 && t("procedures.rowMeta", { n: hospitalCount }), hasCghs && t("procedures.govRate")]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListRow
      href={`/procedures/${slug}`}
      layout="stack"
      title={<DataText>{name}</DataText>}
      subtitle={<MoneyRange low={low} high={high} />}
      meta={meta || undefined}
    />
  );
}

/**
 * /procedures: one quote-checker tile, a filter over names and lay synonyms,
 * then the procedures in display groups. While filtering the groups flatten
 * into one ranked list; the static HTML always carries all the links.
 */
export default function ProcedureListView({
  rows,
  date,
  cghsLineItems,
}: {
  rows: ProcedureListRow[];
  /** HexaHealth retrieval date; null renders "date not recorded". */
  date: string | null;
  cghsLineItems: number;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [query, setQuery] = useState("");
  const ratesLabel = t("procedures.ratesLink", { n: cghsLineItems.toLocaleString("en-IN") });

  const groups = useMemo(() => {
    const sorted = [...rows].sort(byName);
    return GROUP_ORDER.map((key) => ({
      key,
      rows: sorted.filter((r) => procedureGroup(r[0]).group === key),
    })).filter((g) => g.rows.length > 0);
  }, [rows]);

  const haystacks = useMemo(
    () =>
      rows.map((row) => ({
        row,
        hays: [prepare(row[1]), ...synonymsFor(row[0]).map(prepare)] as Prepared[],
      })),
    [rows]
  );

  // null while not filtering; otherwise the matches, best first.
  const matches = useMemo(() => {
    const q = prepareQuery(query);
    if (!q) return null;
    return haystacks
      .map((h) => ({ row: h.row, score: scoreBest(h.hays, q) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score || byName(a.row, b.row))
      .map((m) => m.row);
  }, [haystacks, query]);

  // Announce the number of matches once typing pauses.
  const trimmed = query.trim();
  const matchCount = matches?.length ?? 0;
  useEffect(() => {
    if (!trimmed) return;
    const timer = window.setTimeout(() => {
      announce(
        matchCount > 0
          ? t(matchCount === 1 ? "procedures.countOne" : "procedures.count", { n: matchCount })
          : t("procedures.noMatch", { q: trimmed })
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [trimmed, matchCount, announce, t]);

  return (
    <PageShell>
      <PageHeader title={t("procedures.title")} lead={t("procedures.subtitle", { n: rows.length })} />

      <div className="space-y-10 md:space-y-16">
        <div>
          <TaskTile
            href="/check-quote"
            icon="clipboard"
            title={t("nav.checkQuote")}
            body={t("procedures.quoteTileBody")}
          />
          <div className="mt-8">
            <TextField
              id="procedure-filter"
              type="search"
              label={t("procedures.filterLabel")}
              placeholder={t("procedures.filterPlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              value={query}
              // Below 768px the field moves under the header on focus, so the
              // matches fill the space above the keyboard; Search closes it.
              phoneSearch
              onChange={(e) => setQuery(e.target.value)}
            />
            <SourceNote
              source="HexaHealth"
              href={HEXAHEALTH_URL}
              qualifier={t("source.marketQualifier")}
              date={date}
              anchor="market-prices"
            />
          </div>
        </div>

        {matches ? (
          matches.length > 0 ? (
            <InsetGroup
              heading={t(matches.length === 1 ? "procedures.countOne" : "procedures.count", { n: matches.length })}
              headingId="procedure-matches"
            >
              {matches.map((row) => (
                <ProcedureRow key={row[0]} row={row} />
              ))}
            </InsetGroup>
          ) : (
            // A next step, not a dead end: the CGHS list covers far more treatments.
            <EmptyState
              icon="search"
              title={t("procedures.noMatch", { q: trimmed })}
              body={t("procedures.noMatchBody")}
              action={{ href: "/rates", label: ratesLabel }}
            />
          )
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <InsetGroup key={g.key} heading={t(GROUP_LABEL_KEY[g.key])} headingId={`group-${g.key}`}>
                {g.rows.map((row) => (
                  <ProcedureRow key={row[0]} row={row} />
                ))}
              </InsetGroup>
            ))}
          </div>
        )}
      </div>

      {/* The empty state already carries this link; don't repeat it right below. */}
      {matches?.length !== 0 && (
        <div className="mt-10">
          <ActionLink href="/rates">{ratesLabel}</ActionLink>
        </div>
      )}

      <PageNotes anchor="market-prices">
        <p>{t("procedure.footerNote")}</p>
      </PageNotes>
    </PageShell>
  );
}
