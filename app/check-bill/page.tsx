import type { Metadata } from "next";
import { getMedicinesMeta } from "@/lib/medicines";
import BillCheckView from "@/components/BillCheckView";

export const metadata: Metadata = {
  title: "Check a medicine bill",
  description:
    "Photograph a pharmacy or hospital medicine bill and compare each line with the NPPA ceiling price and the Jan Aushadhi generic. Read on your device, never uploaded.",
};

export default function CheckBillPage() {
  // Only the source meta crosses to the client; lib/medicines.ts is
  // server-only. The ~1,400 reference prices are a static file
  // (public/data/search/medicine-refs.json, written by
  // scripts/build-search-index.mjs) that the view fetches when the first
  // line appears, so they no longer ride in this page's HTML.
  return <BillCheckView meta={getMedicinesMeta()} />;
}
