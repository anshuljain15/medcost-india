import hospitalsJson from "@/data/generated/hospitals.json";
import proceduresJson from "@/data/generated/procedures.json";
import type { Hospital, Procedure } from "./types";

const hospitals = hospitalsJson as Hospital[];
const procedures = proceduresJson as Procedure[];

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
