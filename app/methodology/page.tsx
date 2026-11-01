import type { Metadata } from "next";
import MethodologyView from "@/components/MethodologyView";
import { getMedicinesMeta } from "@/lib/medicines";

export const metadata: Metadata = {
  title: "How we get prices",
  description:
    "Where every price on MedCost India comes from: HexaHealth market estimates, the CGHS rate list, Jan Aushadhi and NPPA medicine prices, patient-shared bills, and how we match them.",
};

// Static copy; the client view exists so the text can follow the visitor's
// language (t()). Only the brand dataset's credit (name, link, licence) comes
// from the medicines meta, read here on the server.
export default function MethodologyPage() {
  return <MethodologyView brands={getMedicinesMeta().brands} />;
}
