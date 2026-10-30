export function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Per-tablet prices: always two decimals (₹1.25, ₹0.20), em-dash for null. */
export function formatINRUnit(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-10-30" -> "30 Oct 2026", "2022-11" -> "Nov 2022". Pure string work, no
 * Date/timezone, so server and client render the same text.
 */
export function formatISODate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const month = MONTHS[Number(m) - 1];
  if (!month) return iso;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}
