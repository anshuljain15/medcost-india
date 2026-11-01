"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MedicineRef, MedicinesMeta } from "@/lib/types";
import {
  assessMedicineLine,
  medicineQuery,
  parseBillText,
  type MedicineLineAssessment,
  type MedicineLineStatus,
} from "@/lib/billCheck";
import { MIN_QUERY_LENGTH, searchMedicines, type MedicineHit } from "@/lib/medicineShards";
import { readImageText } from "@/lib/ocr";
import { formatINR, formatINRUnit, formatISODate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ShareButton from "@/components/ShareButton";
import {
  Badge,
  Button,
  Callout,
  Card,
  ChipRow,
  ChoiceChip,
  DataText,
  Disclosure,
  ExtLink,
  IconButton,
  InlineLink,
  Money,
  PageHeader,
  PageNotes,
  PageShell,
  PhotoInput,
  PrivacyNote,
  ProgressBar,
  SourceNote,
  StatTile,
  StatusLine,
  TextField,
  useAnnounce,
  type IconName,
} from "@/components/ui";

// The person confirms every row. OCR only pre-fills the description, quantity
// and amount, and medicine matches are offered as chips to pick -- never
// chosen automatically, for the same reason PrescriptionScan doesn't search
// on its own: a misread line must become a wrong suggestion, not a wrong flag.
// Nothing typed or photographed leaves the browser.

type Row = {
  id: number;
  description: string;
  qty: string;
  amount: string;
  match: MedicineHit | null;
  /** Collapsed to a one-line summary after a pick that can be checked. */
  collapsed: boolean;
};

type Where = "top" | "bottom";

type ScanState =
  | { kind: "idle" }
  | { kind: "loading"; at: Where }
  | { kind: "reading"; pct: number; at: Where }
  | { kind: "done"; found: number; at: Where }
  | { kind: "failed"; at: Where };

type Line = "above" | "within" | "noCeiling" | "checkUnits";

const LINE: Record<MedicineLineStatus, Line> = {
  aboveCeiling: "above",
  withinCeiling: "within",
  noCeiling: "noCeiling",
  checkUnits: "checkUnits",
};

const LABEL_KEY: Record<Line | "pick", string> = {
  above: "bill.label.above",
  within: "bill.label.within",
  noCeiling: "bill.label.noCeiling",
  checkUnits: "bill.label.checkUnits",
  pick: "bill.label.pick",
};

const BADGE_ICON: Record<Line, IconName> = {
  above: "alert",
  within: "check-circle",
  noCeiling: "info",
  checkUnits: "info",
};

let nextId = 1;
const newRow = (): Row => ({ id: nextId++, description: "", qty: "", amount: "", match: null, collapsed: false });
const rowBase = (id: number) => `bill-line-${id}`;

function num(s: string): number | null {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Digits and one decimal point (bills carry paise: "180.50"). */
function decimalInput(v: string): string {
  const clean = v.replace(/[^\d.]/g, "");
  const dot = clean.indexOf(".");
  return dot < 0 ? clean : clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

/** StatTile labels are sentence fragments ("medicine lines checked"); start them with a capital. */
function sentenceStart(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type T = (path: string, vars?: Record<string, string | number>) => string;

function statusSentence(t: T, a: MedicineLineAssessment, unit: string): string {
  const per = formatINRUnit(a.perUnit);
  const ceiling = formatINRUnit(a.ceilingWithGst);
  switch (a.status) {
    case "aboveCeiling":
      return t("bill.status.aboveCeiling", { per, unit, ceiling });
    case "withinCeiling":
      return t("bill.status.withinCeiling", { per, unit, ceiling });
    case "noCeiling":
      return t("bill.status.noCeiling", { per, unit });
    case "checkUnits":
      return t("bill.status.checkUnits", { per, unit, ceiling });
  }
}

export default function BillCheckView({ refs, meta }: { refs: MedicineRef[]; meta: MedicinesMeta }) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const refsBySlug = useMemo(() => new Map(refs.map((r) => [r.slug, r])), [refs]);
  const [rows, setRows] = useState<Row[]>([]);
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });

  // Focus to move after the next render (new line, collapsed line, removed line).
  const focusId = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId.current) return;
    const el = document.getElementById(focusId.current);
    focusId.current = null;
    el?.focus();
  });
  const focusAfterRender = useCallback((id: string) => {
    focusId.current = id;
  }, []);

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addLine() {
    const row = newRow();
    setRows((rs) => [...rs, row]);
    focusAfterRender(`${rowBase(row.id)}-item`);
  }

  function removeLine(id: number) {
    const left = rows.filter((r) => r.id !== id);
    setRows(left);
    focusAfterRender(left.length > 0 ? "bill-add-line" : "bill-type-instead");
  }

  async function handleFile(file: File, at: Where) {
    setScan({ kind: "loading", at });
    try {
      const text = await readImageText(file, (pct) => setScan({ kind: "reading", pct, at }));
      const parsed: Row[] = parseBillText(text).map((l) => ({
        ...newRow(),
        description: l.description,
        qty: l.qty !== null ? String(l.qty) : "",
        amount: String(l.amount),
      }));
      // Keep anything already typed; drop untouched blank lines.
      setRows((rs) => [...rs.filter((r) => r.description || r.qty || r.amount || r.match), ...parsed]);
      setScan({ kind: "done", found: parsed.length, at });
      announce(parsed.length > 0 ? t("bill.scanFound", { n: parsed.length }) : t("bill.scanNothing"));
      if (parsed.length > 0) focusAfterRender(`${rowBase(parsed[0].id)}-heading`);
    } catch {
      setScan({ kind: "failed", at });
      announce(t("bill.scanFailed"));
    }
  }

  const checked = rows
    .map((r) => {
      const ref = r.match ? refsBySlug.get(r.match.slug) : undefined;
      const qty = num(r.qty);
      const amount = num(r.amount);
      return ref && qty && amount ? { row: r, ref, a: assessMedicineLine(ref, qty, amount) } : null;
    })
    .filter((x): x is { row: Row; ref: MedicineRef; a: MedicineLineAssessment } => x !== null);

  const above = checked.filter((c) => c.a.status === "aboveCeiling").length;
  const saving = Math.round(checked.reduce((s, c) => s + (c.a.possibleSaving ?? 0), 0));
  const busy = scan.kind === "loading" || scan.kind === "reading";

  const scanStatus =
    scan.kind === "loading" || scan.kind === "reading" ? (
      <ProgressBar
        value={scan.kind === "reading" ? scan.pct : 0}
        label={t("bill.addPhoto")}
        // Whole tens, so a screen reader hears a few updates rather than every percent.
        liveText={
          scan.kind === "loading"
            ? t("medicines.scan.loading")
            : t("medicines.scan.reading", { pct: Math.floor(scan.pct / 10) * 10 })
        }
      />
    ) : scan.kind === "failed" ? (
      <Callout>{t("bill.scanFailed")}</Callout>
    ) : scan.kind === "done" ? (
      <Callout>{scan.found > 0 ? t("bill.scanFound", { n: scan.found }) : t("bill.scanNothing")}</Callout>
    ) : null;
  const scanAt = scan.kind === "idle" ? null : scan.at;

  return (
    <PageShell>
      <PageHeader title={t("bill.title")} lead={t("bill.lead")}>
        <p className="text-callout">
          <InlineLink href="/check-quote">{t("bill.quoteLink")}</InlineLink>
        </p>
      </PageHeader>

      <div className="space-y-8">
        {rows.length === 0 && (
          <Card className="space-y-3">
            <PhotoInput label={t("bill.addPhoto")} onFile={(f) => handleFile(f, "top")} disabled={busy} />
            <PrivacyNote>{t("bill.privacy")}</PrivacyNote>
            <p className="text-footnote text-label-2">{t("bill.download")}</p>
            <Button id="bill-type-instead" variant="plain" onClick={addLine}>
              {t("bill.typeInstead")}
            </Button>
          </Card>
        )}

        {scanAt === "top" && scanStatus}

        {checked.length > 0 && (
          <section aria-labelledby="bill-summary" className="space-y-4">
            <h2 id="bill-summary" className="text-title2 text-label">
              {t("bill.summaryHeading")}
            </h2>
            {/* Two tiles and a full-width saving below 768px: three 104px tiles can't hold "₹1,234" at title size. */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <StatTile label={sentenceStart(t("bill.summaryChecked"))} value={checked.length} />
              <StatTile
                label={sentenceStart(t("bill.summaryAbove"))}
                value={above}
                tone={above > 0 ? "warn" : "neutral"}
              />
              <div className="col-span-2 md:col-span-1">
                <StatTile label={sentenceStart(t("bill.summarySaving"))} value={<Money value={saving} />} />
              </div>
            </div>
            {above > 0 && (
              <Callout tone="warn">
                <p>
                  {t("bill.complain")} <ExtLink href={meta.nppa.url}>nppaindia.nic.in</ExtLink>
                </p>
              </Callout>
            )}
            <ShareButton
              text={t("bill.shareText", { n: checked.length, above, saving: formatINR(saving) })}
              path="/check-bill"
            />
          </section>
        )}

        {rows.length > 0 && (
          <ol className="space-y-3">
            {rows.map((r, i) => (
              <BillLine
                key={r.id}
                n={i + 1}
                row={r}
                refsBySlug={refsBySlug}
                meta={meta}
                onChange={(patch) => update(r.id, patch)}
                onRemove={() => removeLine(r.id)}
                focusAfterRender={focusAfterRender}
              />
            ))}
          </ol>
        )}

        {rows.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button id="bill-add-line" variant="tonal" icon="plus" onClick={addLine}>
                {t("bill.addLine")}
              </Button>
              <PhotoInput
                variant="plain"
                label={t("bill.addPhoto")}
                onFile={(f) => handleFile(f, "bottom")}
                disabled={busy}
              />
            </div>
            <PrivacyNote>{t("bill.privacy")}</PrivacyNote>
            {scanAt === "bottom" && scanStatus}
          </div>
        )}
      </div>

      <PageNotes anchor="checks" linkKey="check.methodologyLink">
        <p>
          {t("bill.notChecked")} <InlineLink href="/check-quote">{t("bill.quoteLink")}</InlineLink>
        </p>
        <p>{t("bill.disclaimer")}</p>
        <SourceNote compact source="NPPA" href={meta.nppa.url} date={meta.nppa.exportDate} anchor="checks" />
        <SourceNote
          compact
          source={t("medicines.jaSourceName")}
          href={meta.janAushadhi.url}
          date={meta.janAushadhi.snapshotDate}
          anchor="checks"
        />
        <SourceNote
          compact
          source={meta.brands.name}
          href={meta.brands.url}
          qualifier={t("medicines.brandsQualifier", { license: meta.brands.license })}
          date={meta.brands.snapshotDate}
          anchor="checks"
        />
      </PageNotes>
    </PageShell>
  );
}

function BillLine({
  n,
  row,
  refsBySlug,
  meta,
  onChange,
  onRemove,
  focusAfterRender,
}: {
  n: number;
  row: Row;
  refsBySlug: Map<string, MedicineRef>;
  meta: MedicinesMeta;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  focusAfterRender: (id: string) => void;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const base = rowBase(row.id);
  const query = medicineQuery(row.description);
  const searchable = query.replace(/ /g, "").length >= MIN_QUERY_LENGTH;
  const [suggestions, setSuggestions] = useState<{ for: string; hits: MedicineHit[] }>({ for: "", hits: [] });

  useEffect(() => {
    if (row.match || !searchable) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchMedicines(query, 4).then((hits) => {
        if (!cancelled) setSuggestions({ for: query, hits });
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchable, row.match]);

  const ref = row.match ? refsBySlug.get(row.match.slug) : undefined;
  const qty = num(row.qty);
  const amount = num(row.amount);
  const a = ref && qty && amount ? assessMedicineLine(ref, qty, amount) : null;
  const unit = ref ? t(`medicines.unit.${ref.form}`) : "";
  const searching = !row.match && searchable && suggestions.for !== query;
  const hits = !row.match && searchable && suggestions.for === query ? suggestions.hits : [];
  const lineLabel = t("bill.lineN", { n });
  const matchName = row.match
    ? row.match.kind === "b" && ref
      ? `${row.match.name} (${ref.title})`
      : (ref?.title ?? row.match.name)
    : "";

  function pick(hit: MedicineHit) {
    const pickedRef = refsBySlug.get(hit.slug);
    const canCheck = Boolean(pickedRef && qty && amount);
    onChange({ match: hit, collapsed: canCheck });
    if (canCheck && pickedRef && qty && amount) {
      const status = LINE[assessMedicineLine(pickedRef, qty, amount).status];
      announce(`${lineLabel}: ${t(LABEL_KEY[status])}`);
      focusAfterRender(`${base}-heading`);
    } else {
      focusAfterRender(qty ? `${base}-amount` : `${base}-qty`);
    }
  }

  if (row.collapsed && a && amount && qty) {
    const status = LINE[a.status];
    return (
      <li>
        <Card className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id={`${base}-heading`} tabIndex={-1} className="text-headline text-label focus:outline-none">
              {lineLabel}
            </h2>
            <p className="text-body text-label">
              <DataText>{row.description || matchName}</DataText>
            </p>
            <p className="text-callout tabular-nums text-label-2">
              {qty} · <Money value={amount} />
            </p>
            <div className="mt-2">
              <Badge tone={status === "above" ? "warn" : "neutral"} icon={BADGE_ICON[status]}>
                {t(LABEL_KEY[status])}
              </Badge>
            </div>
          </div>
          <Button
            variant="plain"
            aria-label={`${t("bill.edit")}: ${lineLabel}`}
            onClick={() => {
              onChange({ collapsed: false });
              focusAfterRender(`${base}-item`);
            }}
          >
            {t("bill.edit")}
          </Button>
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id={`${base}-heading`} tabIndex={-1} className="text-headline text-label focus:outline-none">
            {lineLabel}
          </h2>
          <IconButton icon="trash" label={t("bill.remove", { n })} onClick={onRemove} className="-mr-2" />
        </div>

        <TextField
          id={`${base}-item`}
          label={t("bill.colItem")}
          value={row.description}
          onChange={(e) => onChange({ description: e.target.value, match: null })}
          placeholder="Pan 40 Tab"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <div className="grid grid-cols-2 items-end gap-3">
          <TextField
            id={`${base}-qty`}
            label={t("bill.colQty")}
            inputMode="numeric"
            autoComplete="off"
            className="tabular-nums"
            value={row.qty}
            onChange={(e) => onChange({ qty: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="15"
          />
          {/* Not MoneyField: it accepts whole rupees only, and pharmacy bills carry paise. */}
          <TextField
            id={`${base}-amount`}
            label={t("bill.colAmount")}
            inputMode="decimal"
            autoComplete="off"
            className="tabular-nums"
            value={row.amount}
            onChange={(e) => onChange({ amount: decimalInput(e.target.value) })}
          />
        </div>

        {row.match ? (
          <div className="flex flex-wrap items-center gap-x-3">
            <p className="text-body text-label">
              {t("bill.matchedTo")} <DataText>{matchName}</DataText>
            </p>
            <Button variant="plain" onClick={() => onChange({ match: null, collapsed: false })}>
              {t("bill.change")}
            </Button>
          </div>
        ) : hits.length > 0 ? (
          <div className="space-y-3">
            <StatusLine status="pick" label={t("bill.label.pick")} sentence={t("bill.pickMatch")} />
            <ChipRow wrap label={t("bill.pickMatch")}>
              {hits.map((h, i) => (
                <ChoiceChip key={`${h.slug}-${h.name}-${i}`} type="toggle" checked={false} onChange={() => pick(h)}>
                  <DataText>{h.name}</DataText>
                </ChoiceChip>
              ))}
            </ChipRow>
          </div>
        ) : searching ? (
          <p className="text-callout text-label-2">{t("medicines.searching")}</p>
        ) : row.description.trim() ? (
          <p className="text-callout text-label-2">{t("bill.noMatch")}</p>
        ) : null}

        {row.match && !qty && <p className="text-callout text-label-2">{t("bill.needQty")}</p>}

        {a && ref && qty && (
          <div className="space-y-2">
            <StatusLine status={LINE[a.status]} label={t(LABEL_KEY[LINE[a.status]])} sentence={statusSentence(t, a, unit)} />
            {ref.nppaCeiling && (
              <p className="text-footnote text-label-2">
                {t("bill.ceilingSource", {
                  price: formatINRUnit(ref.nppaCeiling.price),
                  so: ref.nppaCeiling.soNumber,
                  date: ref.nppaCeiling.soDate,
                })}
              </p>
            )}
            {a.janAushadhiTotal !== null && a.status !== "checkUnits" && (
              <p className="text-callout text-label">
                {t("bill.jaLine", { qty, unit, ja: formatINR(Math.round(a.janAushadhiTotal)) })}
                {a.possibleSaving !== null && a.possibleSaving >= 1 && (
                  <span className="font-semibold">
                    {" "}
                    {t("bill.jaSaving", { saving: formatINR(Math.round(a.possibleSaving)) })}
                  </span>
                )}
              </p>
            )}
            {row.match?.kind === "b" && row.match.perUnit !== null && a.status !== "checkUnits" && (
              <div className="-mx-4">
                <Disclosure variant="inline" summary={t("common.details")}>
                  <p>{t("bill.brandMrp", { price: formatINRUnit(row.match.perUnit), unit })}</p>
                  <p className="text-footnote">
                    {t("bill.brandCredit", {
                      name: meta.brands.name,
                      date: formatISODate(meta.brands.snapshotDate),
                      license: meta.brands.license,
                    })}{" "}
                    <ExtLink href={meta.brands.url}>Kaggle</ExtLink>
                  </p>
                </Disclosure>
              </div>
            )}
          </div>
        )}
      </Card>
    </li>
  );
}
