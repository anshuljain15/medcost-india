import { parseCghsAmount } from "./format";
import type { MedicineRef, Procedure } from "./types";

// Pure logic behind /check-quote and /check-bill. Nothing here decides that a
// hospital or pharmacy overcharged: the checkers compare a number the person
// typed (or confirmed after OCR) against a dated public reference, and the UI
// words every result as "above / within the reference", never "overcharged".

// ---- Procedure quotes ------------------------------------------------------

export type Ward = "general" | "semiPrivate" | "private";

export type QuotePosition = "below" | "lowerHalf" | "upperHalf" | "above" | "unknown";

export type QuoteAssessment = {
  position: QuotePosition;
  /** 0..1 along cityLow..cityHigh, clamped; null without a range. */
  rangeFraction: number | null;
  /** Hospitals whose typical (avg, else min) price is below the quote. */
  hospitalsBelow: number;
  hospitalsCompared: number;
  cghsRate: number | null;
  /** quote / CGHS rate for the chosen ward. */
  cghsMultiple: number | null;
};

function cghsWardRate(p: Procedure, ward: Ward): number | null {
  const ref = p.cghsReference;
  if (!ref) return null;
  const raw = ward === "general" ? ref.generalWard : ward === "semiPrivate" ? ref.semiPrivateWard : ref.privateWard;
  // Scraped strings such as "38740+GST" or "1,95,000+GST": never Number() them.
  const n = parseCghsAmount(raw);
  return n !== null && n > 0 ? n : null;
}

export function assessQuote(p: Procedure, quote: number, ward: Ward): QuoteAssessment {
  let position: QuotePosition = "unknown";
  let rangeFraction: number | null = null;
  if (p.cityLow !== null && p.cityHigh !== null && p.cityHigh > p.cityLow) {
    const mid = (p.cityLow + p.cityHigh) / 2;
    position = quote < p.cityLow ? "below" : quote > p.cityHigh ? "above" : quote <= mid ? "lowerHalf" : "upperHalf";
    rangeFraction = Math.min(1, Math.max(0, (quote - p.cityLow) / (p.cityHigh - p.cityLow)));
  }

  const typical = p.hospitalPrices
    .map((h) => h.avg ?? h.min)
    .filter((n): n is number => n !== null && n > 0);

  const cghsRate = cghsWardRate(p, ward);
  return {
    position,
    rangeFraction,
    hospitalsBelow: typical.filter((n) => n < quote).length,
    hospitalsCompared: typical.length,
    cghsRate,
    cghsMultiple: cghsRate ? quote / cghsRate : null,
  };
}

// ---- Bill lines (OCR) ------------------------------------------------------

export type ParsedBillLine = { description: string; qty: number | null; amount: number };

// Summary and tax rows, not items. Matched on the description only.
const NON_ITEM = /\b(total|sub ?total|net|gst|cgst|sgst|igst|tax|discount|round|paid|balance|amount in words|bill no|invoice|date|gstin|dl no|phone|mob)\b/i;
const NUMBER = /^\d{1,3}(,\d{2,3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;
const FORM_WORD = /^(tab|tabs|tablet|tablets|cap|caps|capsule|capsules)\.?$/i;
const isQty = (n: number) => Number.isInteger(n) && n > 0 && n <= 500;

/**
 * Best-effort split of OCR text into item rows: a description followed by
 * numeric columns, the last of which is taken as the line amount and the one
 * before it (if a small whole number) as the quantity. Pharmacy bill layouts
 * vary too much to do better, so every row stays editable in the UI.
 */
export function parseBillText(text: string): ParsedBillLine[] {
  const out: ParsedBillLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const tokens = raw.replace(/[|₹]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2) continue;

    const nums: number[] = [];
    let end = tokens.length;
    while (end > 0 && NUMBER.test(tokens[end - 1])) {
      nums.unshift(Number(tokens[end - 1].replace(/,/g, "")));
      end--;
    }
    if (nums.length === 0) continue;

    let desc = tokens.slice(0, end);
    if (desc.length > 1 && /^\d{1,3}\.?$/.test(desc[0])) desc = desc.slice(1); // serial number
    const prev = nums.length >= 2 ? nums[nums.length - 2] : null;
    let qty = prev !== null && isQty(prev) ? prev : null;

    // "PAN 40 TAB 15 B123 180.00": a batch code splits the quantity off the
    // trailing numbers. Take an integer only if it follows a dosage-form word,
    // so the strength ("40") is never read as a quantity.
    if (qty === null) {
      const form = desc.findIndex((tok) => FORM_WORD.test(tok));
      const q = form >= 0 ? desc.findIndex((tok, j) => j > form && /^\d+$/.test(tok) && isQty(Number(tok))) : -1;
      if (q > 0) {
        qty = Number(desc[q]);
        desc = desc.slice(0, q);
      }
    }

    const description = desc.join(" ").replace(/[^A-Za-z0-9.%+\-/ ]+/g, " ").replace(/\s+/g, " ").trim();
    if (!/[A-Za-z]{3,}/.test(description) || NON_ITEM.test(description)) continue;

    const amount = nums[nums.length - 1];
    if (!(amount >= 1)) continue;
    out.push({ description, qty, amount });
  }
  return out;
}

/** "PAN 40 TAB" -> "PAN 40": the name plus its strength searches best. */
export function medicineQuery(description: string): string {
  const tokens = description.split(/\s+/);
  const i = tokens.findIndex((tok) => /^[A-Za-z][A-Za-z-]{2,}$/.test(tok));
  if (i < 0) return "";
  const next = tokens[i + 1];
  return next && /^\d+(\.\d+)?$/.test(next) ? `${tokens[i]} ${next}` : tokens[i];
}

// ---- Medicine lines --------------------------------------------------------

/**
 * NPPA ceilings exclude GST. Medicines are taxed at 5% or 12% depending on
 * the item, and a bill doesn't say which, so we allow the higher rate: a line
 * is flagged only if it is above the ceiling even with 12% GST added.
 */
export const MAX_GST = 0.12;
/** Rounding slack on a per-unit price computed from a line total. */
const TOLERANCE = 1.01;
/**
 * Far above the ceiling usually means the quantity is in strips, not tablets
 * (a strip is 10 or 15). Ask the person to check rather than flag it.
 */
const STRIPS_SUSPECT = 6;

export type MedicineLineStatus = "aboveCeiling" | "withinCeiling" | "noCeiling" | "checkUnits";

export type MedicineLineAssessment = {
  perUnit: number;
  status: MedicineLineStatus;
  ceilingWithGst: number | null;
  /** What the same quantity would cost as the Jan Aushadhi generic. */
  janAushadhiTotal: number | null;
  possibleSaving: number | null;
};

export function assessMedicineLine(ref: MedicineRef, qty: number, amount: number): MedicineLineAssessment {
  const perUnit = amount / qty;
  const ceilingWithGst = ref.nppaCeiling ? ref.nppaCeiling.price * (1 + MAX_GST) : null;

  let status: MedicineLineStatus = "noCeiling";
  if (ceilingWithGst !== null) {
    if (perUnit > ceilingWithGst * STRIPS_SUSPECT) status = "checkUnits";
    else if (perUnit > ceilingWithGst * TOLERANCE) status = "aboveCeiling";
    else status = "withinCeiling";
  }

  const janAushadhiTotal = ref.jaPerUnit !== null ? ref.jaPerUnit * qty : null;
  const possibleSaving =
    janAushadhiTotal !== null && status !== "checkUnits" && amount > janAushadhiTotal ? amount - janAushadhiTotal : null;

  return { perUnit, status, ceilingWithGst, janAushadhiTotal, possibleSaving };
}

export function roundRupees(n: number): number {
  return Math.round(n);
}
