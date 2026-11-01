import type { Metadata } from "next";
import { getCities, getHospitalsByCity, getSourceDates } from "@/lib/data";
import HospitalListClient, { type CitySummary } from "@/components/HospitalListClient";

export const metadata: Metadata = {
  title: "Find a hospital",
  description:
    "Hospitals in six Indian cities from the Bajaj Allianz cashless network list, with treatment prices for Bangalore.",
};

// Server component: it counts the directory here and passes six numbers down,
// so hospitals.json never reaches this page's client bundle. Name search reads
// the static hospital index (lib/staticData.ts) on first focus instead.
export default function HospitalsPage() {
  const cities: CitySummary[] = getCities().map((label) => {
    const slug = label.toLowerCase();
    return {
      slug,
      label,
      count: getHospitalsByCity(label).length,
      // The Bangalore gate: the only city with linked treatment prices.
      priced: slug === "bangalore",
    };
  });
  const total = cities.reduce((sum, c) => sum + c.count, 0);

  return (
    <HospitalListClient cities={cities} total={total} directoryDate={getSourceDates().directory} />
  );
}
