import hospitalsJson from "@/data/generated/hospitals.json";
import proceduresJson from "@/data/generated/procedures.json";
import sourceDatesJson from "@/data/source-dates.json";
import type { Hospital, Procedure, ProcedureHospitalPrice, SourceDates } from "./types";

/**
 * A hospital-wise HexaHealth row is used only when its own numbers agree:
 * min <= avg <= max over the values present. Four ascitic-tap rows break this
 * (a per-variant HexaHealth table read by column position: e.g. Manipal
 * Whitefield ₹5,000–8,000 with an average of ₹12,000), and a "typical" price
 * outside the row's own range is a self-contradicting claim about a named
 * hospital. A missing row is better than a wrong one, so the rule is applied
 * once, here at the data seam: the procedure, hospital, quote and hub pages,
 * the city "has prices" badge and the quote checker's "{below} of {n}" all
 * see the same rows. scripts/build-search-index.mjs counts with the same rule.
 */
export function isConsistentHospitalPrice(h: ProcedureHospitalPrice): boolean {
  const lo = h.min ?? -Infinity;
  const hi = h.max ?? Infinity;
  return lo <= hi && (h.avg === null || (lo <= h.avg && h.avg <= hi));
}

const hospitals = hospitalsJson as Hospital[];
const procedures = (proceduresJson as Procedure[]).map((p) => ({
  ...p,
  hospitalPrices: p.hospitalPrices.filter(isConsistentHospitalPrice),
}));
const sourceDates = sourceDatesJson as SourceDates;

/**
 * Retrieval dates for HexaHealth, CGHS and the hospital directory. Server
 * only: pages read this and pass the dates down as props. Each is null until
 * the data owner records it, and null renders as "date not recorded".
 */
export function getSourceDates(): SourceDates {
  return sourceDates;
}

export function getAllProcedures(): Procedure[] {
  return procedures;
}

export function getProcedureBySlug(slug: string): Procedure | undefined {
  return procedures.find((p) => p.slug === slug);
}

export function getProceduresAtHospital(hospitalSlug: string): Procedure[] {
  return procedures.filter((p) =>
    p.hospitalPrices.some((hp) => hp.hospitalSlug === hospitalSlug)
  );
}

export function getCities(): string[] {
  return Array.from(new Set(hospitals.map((h) => h.city))).sort();
}

export function getHospitalsByCity(city: string): Hospital[] {
  return hospitals.filter((h) => h.city.toLowerCase() === city.toLowerCase());
}

export function getAllHospitals(): Hospital[] {
  return hospitals;
}

export function getHospitalBySlug(city: string, slug: string): Hospital | undefined {
  return hospitals.find(
    (h) => h.slug === slug && h.city.toLowerCase() === city.toLowerCase()
  );
}

export function getAllSlugs(): { city: string; slug: string }[] {
  return hospitals.map((h) => ({ city: h.city.toLowerCase(), slug: h.slug }));
}
