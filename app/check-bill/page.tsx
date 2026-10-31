import { getMedicineRefs, getMedicinesMeta } from "@/lib/medicines";
import BillCheckView from "@/components/BillCheckView";

export const metadata = {
  title: "Check a medicine bill | MedCost India",
  description:
    "Photograph a pharmacy or hospital medicine bill and compare each line with the NPPA ceiling price and the Jan Aushadhi generic. Read on your device, never uploaded.",
};

export default function CheckBillPage() {
  // Only the reference slice crosses to the client (lib/medicines.ts is server-only).
  return <BillCheckView refs={getMedicineRefs()} nppaUrl={getMedicinesMeta().nppa.url} />;
}
