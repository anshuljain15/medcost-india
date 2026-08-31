import cghsRatesJson from "@/data/generated/cghs_rates.json";
import type { CghsRate } from "./types";

const cghsRates = cghsRatesJson as CghsRate[];

export function getCghsRates(): CghsRate[] {
  return cghsRates;
}

export function getCghsSpecialties(): string[] {
  return Array.from(new Set(cghsRates.map((r) => r.specialty))).sort();
}
