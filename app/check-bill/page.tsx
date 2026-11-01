import type { Metadata } from "next";
import { getMedicineRefs, getMedicinesMeta } from "@/lib/medicines";
import BillCheckView from "@/components/BillCheckView";

export const metadata: Metadata = {
  title: "Check a medicine bill",
  description:
    "Photograph a pharmacy or hospital medicine bill and compare each line with the NPPA ceiling price and the Jan Aushadhi generic. Read on your device, never uploaded.",
};

export default function CheckBillPage() {
  // Only the reference slice (~1,400 small rows) and the source meta cross to
  // the client; lib/medicines.ts is server-only.
  return <BillCheckView refs={getMedicineRefs()} meta={getMedicinesMeta()} />;
}
