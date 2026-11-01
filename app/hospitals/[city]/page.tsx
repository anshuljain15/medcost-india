import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProcedures, getCities, getHospitalsByCity, getSourceDates } from "@/lib/data";
import { cleanCount } from "@/lib/format";
import CityView, { type CityHospital } from "@/components/CityView";

export function generateStaticParams() {
  return getCities().map((city) => ({ city: city.toLowerCase() }));
}

export const dynamicParams = false;

type Params = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city } = await params;
  const label = getHospitalsByCity(city)[0]?.city ?? city;
  return {
    title: `Hospitals in ${label}`,
    description: `Hospitals in ${label} from the Bajaj Allianz cashless network list, with a map.`,
  };
}

/**
 * Hospitals with at least one HexaHealth price matched to them. Bangalore
 * only (the gate CLAUDE.md describes): procedures.json is a Bangalore pilot,
 * and slugs are unique only within a city.
 */
function pricedSlugs(city: string): Set<string> {
  if (city !== "bangalore") return new Set();
  const slugs = new Set<string>();
  for (const p of getAllProcedures()) {
    for (const hp of p.hospitalPrices) if (hp.hospitalSlug) slugs.add(hp.hospitalSlug);
  }
  return slugs;
}

export default async function CityPage({ params }: Params) {
  const { city } = await params;
  const hospitals = getHospitalsByCity(city);
  if (hospitals.length === 0) notFound();

  const priced = pricedSlugs(city);
  // Only the fields the list and the map show, A to Z (the list says so).
  const rows: CityHospital[] = hospitals
    .map((h) => ({
      slug: h.slug,
      name: h.name,
      address: h.address,
      pincode: h.pincode,
      beds: cleanCount(h.bedCount),
      lat: h.lat,
      lon: h.lon,
      priced: priced.has(h.slug),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

  return (
    <CityView
      cityLabel={hospitals[0].city}
      citySlug={city}
      hospitals={rows}
      directoryDate={getSourceDates().directory}
    />
  );
}
