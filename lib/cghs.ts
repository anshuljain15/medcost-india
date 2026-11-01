import cghsRatesJson from "@/data/generated/cghs_rates.json";
import type { CghsRate } from "./types";

// Server only. cghs_rates.json is about 1 MB: read it in a server component
// and pass down the slice a view needs. The browser reads the same list as the
// static index public/data/search/cghs.json (lib/staticData.ts loadCghsIndex),
// never through this module.

const cghsRates = cghsRatesJson as CghsRate[];

/**
 * Where the CGHS rate list comes from: the URL recorded in
 * data-pipeline/sources/cghs.py. Shown as the source link under CGHS prices.
 */
export const CGHS_SOURCE_URL = "https://cghs.mohfw.gov.in/AHIMSG5/hislogin/getCghsRateListLgnFtr";

export function getCghsRates(): CghsRate[] {
  return cghsRates;
}

export function getCghsSpecialties(): string[] {
  return Array.from(new Set(cghsRates.map((r) => r.specialty))).sort();
}

/**
 * Number of distinct CGHS line items (codes). Every code appears twice in the
 * list, once at the NABH rate and once at the non-NABH rate, so this is the
 * row count halved, not the row count.
 */
export function getCghsLineItemCount(): number {
  return new Set(cghsRates.map((r) => r.code)).size;
}
