"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MedicineRef } from "@/lib/types";
import {
  assessMedicineLine,
  medicineQuery,
  parseBillText,
  type MedicineLineAssessment,
} from "@/lib/billCheck";
import { MIN_QUERY_LENGTH, searchMedicines, type MedicineHit } from "@/lib/medicineShards";
import { readImageText } from "@/lib/ocr";
import { formatINR, formatINRUnit } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ShareButton from "@/components/ShareButton";

// The person confirms every row. OCR only pre-fills the description, quantity
// and amount, and medicine matches are offered as chips to pick -- never
// chosen automatically, for the same reason PrescriptionScan doesn't search
// on its own: a misread line must become a wrong suggestion, not a wrong flag.

type Row = {
  id: number;
  description: string;
  qty: string;
  amount: string;
  match: MedicineHit | null;
};

type ScanState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "reading"; pct: number }
  | { kind: "done"; found: number }
  | { kind: "failed" };

let nextId = 1;
const emptyRow = (): Row => ({ id: nextId++, description: "", qty: "", amount: "", match: null });

function num(s: string): number | null {
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function BillCheckView({ refs, nppaUrl }: { refs: MedicineRef[]; nppaUrl: string }) {
  const { t } = useTranslation();
  const refsBySlug = useMemo(() => new Map(refs.map((r) => [r.slug, r])), [refs]);
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [scan, setScan] = useState<ScanState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  function update(id: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleFile(file: File) {
    setScan({ kind: "loading" });
    try {
      const text = await readImageText(file, (pct) => setScan({ kind: "reading", pct }));
      const lines = parseBillText(text);
      const parsed = lines.map((l) => ({
        id: nextId++,
        description: l.description,
        qty: l.qty !== null ? String(l.qty) : "",
        amount: String(l.amount),
        match: null,
      }));
      // Keep anything already typed; drop the untouched blank starter row.
      setRows((rs) => [...rs.filter((r) => r.description || r.amount), ...parsed]);
      setScan({ kind: "done", found: parsed.length });
    } catch {
      setScan({ kind: "failed" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
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
  const saving = checked.reduce((s, c) => s + (c.a.possibleSaving ?? 0), 0);
  const busy = scan.kind === "loading" || scan.kind === "reading";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("bill.eyebrow")}</div>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">{t("bill.title")}</h1>
      <p className="mt-3 max-w-2xl text-ink-700">{t("bill.subtitle")}</p>

      <div className="mt-8 rounded-2xl border border-ink-100 bg-ink-50 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ${
              busy ? "pointer-events-none opacity-60" : "hover:bg-brand-700"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
              <path d="M3 7h3l2-3h8l2 3h3v13H3z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {t("bill.scanButton")}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <span className="text-sm text-ink-500">{t("bill.or")}</span>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
            className="rounded-full border border-ink-300 bg-surface px-4 py-2 text-sm font-medium text-ink-700 hover:border-brand-500"
          >
            {t("bill.addLine")}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-500">{t("bill.privacy")}</p>
        {scan.kind === "loading" && <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.loading")}</p>}
        {scan.kind === "reading" && (
          <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.reading", { pct: scan.pct })}</p>
        )}
        {scan.kind === "failed" && <p className="mt-3 text-sm text-ink-700">{t("bill.scanFailed")}</p>}
        {scan.kind === "done" && (
          <p className="mt-3 text-sm text-ink-700">
            {scan.found > 0 ? t("bill.scanFound", { n: scan.found }) : t("bill.scanNothing")}
          </p>
        )}
      </div>

      <ol className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <BillRow
            key={r.id}
            index={i + 1}
            row={r}
            refsBySlug={refsBySlug}
            onChange={(patch) => update(r.id, patch)}
            onRemove={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
          />
        ))}
      </ol>

      {checked.length > 0 && (
        <section className="mt-8 rounded-2xl bg-contrast p-6 text-contrast-fg">
          <h2 className="text-lg font-semibold">{t("bill.summaryHeading")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-3xl font-bold">{checked.length}</div>
              <div className="text-sm opacity-80">{t("bill.summaryChecked")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{above}</div>
              <div className="text-sm opacity-80">{t("bill.summaryAbove")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{formatINR(Math.round(saving))}</div>
              <div className="text-sm opacity-80">{t("bill.summarySaving")}</div>
            </div>
          </div>
          {above > 0 && (
            <p className="mt-4 text-sm opacity-90">
              {t("bill.complain")}{" "}
              <a href={nppaUrl} target="_blank" rel="noopener noreferrer" className="underline">
                NPPA
              </a>
              .
            </p>
          )}
          <div className="mt-4">
            <ShareButton
              text={t("bill.shareText", { n: checked.length, above, saving: formatINR(Math.round(saving)) })}
              path="/check-bill"
            />
          </div>
        </section>
      )}

      <p className="mt-8 text-sm text-ink-500">
        {t("bill.notChecked")}{" "}
        <Link href="/check-quote" className="text-brand-700 underline">
          {t("bill.quoteLink")}
        </Link>
      </p>
      <p className="mt-4 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-700">
        {t("bill.disclaimer")}{" "}
        <Link href="/methodology" className="underline">
          {t("check.methodologyLink")}
        </Link>
      </p>
    </div>
  );
}

function BillRow({
  index,
  row,
  refsBySlug,
  onChange,
  onRemove,
}: {
  index: number;
  row: Row;
  refsBySlug: Map<string, MedicineRef>;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const query = medicineQuery(row.description);
  const [suggestions, setSuggestions] = useState<{ for: string; hits: MedicineHit[] }>({ for: "", hits: [] });

  useEffect(() => {
    if (row.match || query.replace(/ /g, "").length < MIN_QUERY_LENGTH) return;
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
  }, [query, row.match]);

  const ref = row.match ? refsBySlug.get(row.match.slug) : undefined;
  const qty = num(row.qty);
  const amount = num(row.amount);
  const a = ref && qty && amount ? assessMedicineLine(ref, qty, amount) : null;
  const unitWord = ref ? t(`medicines.unit.${ref.form}`) : "";
  const hits = suggestions.for === query ? suggestions.hits : [];

  const inputCls =
    "mt-1 w-full rounded-lg border border-ink-300 bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <li className="rounded-2xl border border-ink-100 bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-7 w-5 shrink-0 text-sm font-bold text-brand-600">{index}</span>
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_8rem_8rem]">
          <label className="block">
            <span className="text-xs text-ink-500">{t("bill.colItem")}</span>
            <input
              value={row.description}
              onChange={(e) => onChange({ description: e.target.value, match: null })}
              placeholder="Pan 40 Tab"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">{t("bill.colQty")}</span>
            <input
              inputMode="numeric"
              value={row.qty}
              onChange={(e) => onChange({ qty: e.target.value.replace(/[^\d]/g, "") })}
              placeholder="15"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className="text-xs text-ink-500">{t("bill.colAmount")}</span>
            <input
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => onChange({ amount: e.target.value.replace(/[^\d.,]/g, "") })}
              placeholder="₹"
              className={inputCls}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("bill.remove")}
          className="mt-7 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-50"
        >
          ×
        </button>
      </div>

      <div className="mt-3 pl-8">
        {row.match ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ink-500">{t("bill.matchedTo")}</span>
            <Link href={`/medicines/${row.match.slug}`} className="font-medium text-brand-700 hover:underline">
              {ref?.title ?? row.match.name}
            </Link>
            {row.match.kind === "b" && <span className="text-ink-500">({row.match.name})</span>}
            <button type="button" onClick={() => onChange({ match: null })} className="text-xs text-ink-500 underline">
              {t("bill.change")}
            </button>
          </div>
        ) : hits.length > 0 ? (
          <div>
            <p className="text-xs text-ink-500">{t("bill.pickMatch")}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {hits.map((h, i) => (
                <button
                  key={`${h.slug}-${h.name}-${i}`}
                  type="button"
                  onClick={() => onChange({ match: h })}
                  className="rounded-full border border-brand-200 px-3 py-1 text-sm text-brand-800 hover:bg-brand-50"
                >
                  {h.name}
                </button>
              ))}
            </div>
          </div>
        ) : row.description.trim() ? (
          <p className="text-xs text-ink-500">{t("bill.noMatch")}</p>
        ) : null}

        {row.match && !qty && <p className="mt-2 text-xs text-ink-500">{t("bill.needQty")}</p>}

        {a && ref && qty && (
          <div
            className={`mt-3 rounded-xl p-3 text-sm ${
              a.status === "aboveCeiling" || a.status === "checkUnits"
                ? "bg-warn-50 text-warn-900"
                : "bg-brand-50 text-ink-900"
            }`}
          >
            <p className="font-semibold">
              {t(`bill.status.${a.status}`, {
                per: formatINRUnit(a.perUnit),
                unit: unitWord,
                ceiling: formatINRUnit(a.ceilingWithGst),
              })}
            </p>
            {ref.nppaCeiling && a.status !== "checkUnits" && (
              <p className="mt-1 text-xs opacity-80">
                {t("bill.ceilingSource", {
                  price: formatINRUnit(ref.nppaCeiling.price),
                  so: ref.nppaCeiling.soNumber,
                  date: ref.nppaCeiling.soDate,
                })}
              </p>
            )}
            {a.janAushadhiTotal !== null && a.status !== "checkUnits" && (
              <p className="mt-1">
                {t("bill.jaLine", {
                  qty,
                  unit: unitWord,
                  ja: formatINR(Math.round(a.janAushadhiTotal)),
                })}
                {a.possibleSaving !== null && a.possibleSaving >= 1 && (
                  <strong> {t("bill.jaSaving", { saving: formatINR(Math.round(a.possibleSaving)) })}</strong>
                )}
              </p>
            )}
            {row.match?.kind === "b" && row.match.perUnit !== null && a.status !== "checkUnits" && (
              <p className="mt-1 text-xs opacity-80">
                {t("bill.brandMrp", { price: formatINRUnit(row.match.perUnit), unit: unitWord })}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
