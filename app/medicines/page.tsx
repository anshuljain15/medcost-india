import type { Metadata } from "next";
import { getAllMedicineGroups, getMedicinesMeta } from "@/lib/medicines";
import MedicineSearchView from "@/components/MedicineSearchView";

export const metadata: Metadata = {
  title: "Find a cheaper medicine",
  description:
    "Search a brand or salt and see the government Jan Aushadhi generic with exactly the same salt, strength and form, and the NPPA legal ceiling price.",
};

export default function MedicinesPage() {
  const meta = getMedicinesMeta();
  // Only the count and the source dates cross to the client; the search
  // itself reads the sharded index under public/data/ (lib/medicineShards.ts).
  return (
    <MedicineSearchView
      groupCount={getAllMedicineGroups().length}
      jaDate={meta.janAushadhi.snapshotDate}
      brands={meta.brands}
    />
  );
}
