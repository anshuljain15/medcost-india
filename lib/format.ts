// One formatter each, created once: toLocaleString() would build a new
// Intl.NumberFormat on every call, and /rates formats ~300 amounts a keystroke.
const INR = new Intl.NumberFormat("en-IN");
const INR_UNIT = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₹${INR.format(n)}`;
}

/** Per-tablet prices: always two decimals (₹1.25, ₹0.20), em-dash for null. */
export function formatINRUnit(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₹${INR_UNIT.format(n)}`;
}

/** English short month names, the default for formatISODate. */
export const EN_MONTHS: readonly string[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-10-30" -> "30 Oct 2026", "2022-11" -> "Nov 2022". Pure string work, no
 * Date/timezone, so server and client render the same text. `months` are the
 * 12 month names of the UI language: components normally call `formatDate`
 * from useTranslation(), which passes the Hindi names under the Hindi UI
 * ("30 अक्टूबर 2026"). Day and year stay in Latin digits, like the money.
 */
export function formatISODate(iso: string | null | undefined, months: readonly string[] = EN_MONTHS): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const month = months[Number(m) - 1];
  if (!month) return iso;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

// ---- Lakh / crore reading aids ------------------------------------------
// The exact figure is always the hero; these only produce the caption under it
// ("about ₹1.7–6.9 lakh"). Integer steps avoid float drift: one lakh tenth is
// ₹10,000 and one crore hundredth is ₹1,00,000.

const LAKH = 100_000;
const CRORE = 10_000_000;

/** "1.50" -> "1.5", "2.00" -> "2", "6.9" -> "6.9". */
function trimDecimals(fixed: string): string {
  return fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed;
}

/**
 * Caption parts for a range. null when high < ₹1,00,000. Crore (2 decimals)
 * when high >= ₹1,00,00,000, else lakh (1 decimal). LOW rounds DOWN and HIGH
 * rounds UP, so the caption is never narrower than the source range.
 */
export function lakhParts(
  low: number,
  high: number
): { low: string; high: string; unit: "lakh" | "crore" } | null {
  if (!Number.isFinite(low) || !Number.isFinite(high) || high < LAKH) return null;
  if (high >= CRORE) {
    const step = CRORE / 100;
    return {
      low: trimDecimals((Math.floor(low / step) / 100).toFixed(2)),
      high: trimDecimals((Math.ceil(high / step) / 100).toFixed(2)),
      unit: "crore",
    };
  }
  const step = LAKH / 10;
  return {
    low: trimDecimals((Math.floor(low / step) / 10).toFixed(1)),
    high: trimDecimals((Math.ceil(high / step) / 10).toFixed(1)),
    unit: "lakh",
  };
}

/**
 * One amount as lakh/crore for the MoneyField readback ("₹2,40,000 · ₹2.4 lakh").
 * Up to 2 decimals, rounded to nearest; null under ₹1 lakh.
 */
export function amountShort(n: number): { value: string; unit: "lakh" | "crore" } | null {
  if (!Number.isFinite(n) || n < LAKH) return null;
  let unit: "lakh" | "crore" = n >= CRORE ? "crore" : "lakh";
  let hundredths = Math.round((n / (unit === "crore" ? CRORE : LAKH)) * 100);
  // 99,99,999 rounds to "100 lakh": say "1 crore" instead.
  if (unit === "lakh" && hundredths >= 10_000) {
    unit = "crore";
    hundredths = Math.round((n / CRORE) * 100);
  }
  return { value: trimDecimals((hundredths / 100).toFixed(2)), unit };
}

// ---- Cleaning free-text source fields -------------------------------------

/**
 * CGHS ward amounts are scraped strings: "50350", "1234.5", "38740+GST",
 * "1,95,000+GST", "Rs 23,625(Inclusive of GST)", "Unlisted". Returns the one
 * listed amount, or null for "Unlisted", "" and anything that is not a single
 * amount -- never NaN. Note "+GST" rows return the pre-GST figure as listed.
 */
export function parseCghsAmount(s: string | null): number | null {
  if (s === null) return null;
  const m = /^(?:rs\.?|₹)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:\+\s*gst|\(\s*inclusive of gst\s*\))?$/i.exec(
    s.trim()
  );
  if (!m) return null;
  const digits = m[1].replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * The GST qualifier a CGHS amount carries: "plus" for "38740+GST" (the listed
 * figure is before GST, so the bill will be higher), "incl" for "Rs
 * 23,625(Inclusive of GST)", null for a plain amount or anything unparsed.
 * The three ward strings of one CGHS row carry the same qualifier, so callers
 * read it once per row (general ward first) and show it once, next to the
 * figures, never folded into them.
 */
export function cghsGst(s: string | null | undefined): "plus" | "incl" | null {
  if (s === null || s === undefined || parseCghsAmount(s) === null) return null;
  if (/\+\s*gst\s*$/i.test(s.trim())) return "plus";
  if (/\(\s*inclusive of gst\s*\)\s*$/i.test(s.trim())) return "incl";
  return null;
}

/** A 10-digit Indian national number from 12 digits "91…", 11 digits "0…" or 10 digits. */
function nationalNumber(d: string): string | null {
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 && d[0] !== "0" ? d : null;
}

/**
 * A dialable tel: href for the directory's free-text phone field, or null.
 *
 * The field is "STD-NUMBER" and NUMBER usually repeats the STD code already
 * ("011-1142504250", "080-8040933219"), or is a mobile behind a default prefix
 * ("0-9848958567", "11-9899066055"). Concatenating every digit would dial a
 * 12-13 digit garbage string, so: first number only (split on , / ; " or "),
 * a letter O between digits read as 0, then accept only a 10-digit national
 * number taken from NUMBER alone or from STD + NUMBER. Everything else is null
 * ("0-0", "-91", "11-0", "-DHS/NH/1262", 8-digit landlines with no STD code,
 * a landline whose area code contradicts the STD field):
 * a wrong number for a real hospital is worse than no Call button. The full
 * string is still shown as text.
 */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const first = phone
    .split(/,|\/|;|\bor\b/i)
    .map((part) => part.trim())
    .find((part) => /\d/.test(part));
  if (!first) return null;
  const text = first.replace(/(\d)[oO](?=\d)/g, (_, d: string) => `${d}0`);

  if (text.startsWith("+")) {
    const digits = text.replace(/\D/g, "");
    const nsn = nationalNumber(digits);
    if (nsn && digits.startsWith("91")) return `tel:+91${nsn}`;
    return digits.length >= 8 && !digits.startsWith("91") ? `tel:+${digits}` : null;
  }

  const dash = text.indexOf("-");
  let std = dash === -1 ? "" : text.slice(0, dash).replace(/\D/g, "").replace(/^0+/, "");
  // No STD code starts with 9, so "91-…" / "9140-…" carry the country code.
  if (std.startsWith("91")) std = std.slice(2);
  const num = (dash === -1 ? text : text.slice(dash + 1)).replace(/\D/g, "");

  const own = nationalNumber(num);
  if (own) {
    // A landline whose own area code contradicts the STD field is a data
    // error ("080-3323185544" would ring Kolkata), not a number to dial.
    if (!/^[6-9]/.test(own) && std && !own.startsWith(std)) return null;
    return `tel:+91${own}`;
  }
  const joined = std ? nationalNumber(std + num) : null;
  return joined ? `tel:+91${joined}` : null;
}

/** "120.0" -> 120, "35" -> 35; "0", "0.0", blanks and junk -> null (hide the row). */
export function cleanCount(s: string | null): number | null {
  if (s === null) return null;
  const m = /^(\d+)(?:\.0*)?$/.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 ? n : null;
}

/** "8900080378735.0" -> "8900080378735" (spreadsheet float residue); blank -> null. */
export function cleanCode(s: string | null): string | null {
  if (s === null) return null;
  const code = s.trim().replace(/\.0+$/, "");
  return code === "" ? null : code;
}
