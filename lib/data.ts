import hospitalsJson from "@/data/generated/hospitals.json";
import type { Hospital } from "./types";

const hospitals = hospitalsJson as Hospital[];

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
