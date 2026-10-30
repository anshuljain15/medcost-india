import { getAllMedicineGroups } from "@/lib/medicines";
import MedicineSearchView from "@/components/MedicineSearchView";

export default function MedicinesPage() {
  // Only the count crosses to the client; the search itself reads the
  // sharded index under public/data/ (lib/medicineShards.ts).
  return <MedicineSearchView groupCount={getAllMedicineGroups().length} />;
}
