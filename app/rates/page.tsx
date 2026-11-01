import type { Metadata } from "next";
import { getSourceDates } from "@/lib/data";
import { CGHS_SOURCE_URL, getCghsLineItemCount, getCghsSpecialties } from "@/lib/cghs";
import RateExplorer from "@/components/RateExplorer";

export const metadata: Metadata = {
  title: "Govt (CGHS) rates",
  description:
    "Search the Central Government Health Scheme (CGHS) Tier I rate list: what the government pays hospitals for each treatment, by room type.",
};

// Server page: only the counts and the specialty names reach the client. The
// rate rows are fetched as static JSON (public/data/search/cghs.json) on first
// use, so the 1 MB cghs_rates.json never enters the page bundle.
export default function RatesPage() {
  const specialties = getCghsSpecialties();
  return (
    <RateExplorer
      lineItems={getCghsLineItemCount()}
      specialties={specialties}
      date={getSourceDates().cghs}
      sourceUrl={CGHS_SOURCE_URL}
    />
  );
}
