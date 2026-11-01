import hospitalsJson from "@/data/generated/hospitals.json";
import proceduresJson from "@/data/generated/procedures.json";
import sourceDatesJson from "@/data/source-dates.json";
import type { Hospital, Procedure, SourceDates } from "./types";

const hospitals = hospitalsJson as Hospital[];
const procedures = proceduresJson as Procedure[];
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
