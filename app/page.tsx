import type { Metadata } from "next";
import HomeView from "@/components/HomeView";
import { getAllHospitals, getAllProcedures, getCities } from "@/lib/data";
import { getAllMedicineGroups, getMedicinesMeta } from "@/lib/medicines";

export const metadata: Metadata = {
  title: { absolute: "MedCost India — was your hospital bill fair?" },
};

// Server component (§6 "/"). It reads the snapshot here and passes only four
// counts and the Jan Aushadhi list date to the client view, so no hospital,
// procedure or medicine rows reach the home bundle. Search reads its own
// static indexes (lib/staticData.ts) on first focus.
export default function HomePage() {
  return (
    <HomeView
      counts={{
        procedures: getAllProcedures().length,
        hospitals: getAllHospitals().length,
        cities: getCities().length,
        medicines: getAllMedicineGroups().length,
      }}
      medicinesDate={getMedicinesMeta().janAushadhi.snapshotDate}
    />
  );
}
