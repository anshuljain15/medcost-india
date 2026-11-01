import type { Metadata } from "next";
import MethodologyView from "@/components/MethodologyView";

export const metadata: Metadata = {
  title: "How we get prices",
  description:
    "Where every price on MedCost India comes from: HexaHealth market estimates, the CGHS rate list, Jan Aushadhi and NPPA medicine prices, patient-shared bills, and how we match them.",
};

// Static copy only; the client view exists so the text can follow the
// visitor's language (t()).
export default function MethodologyPage() {
  return <MethodologyView />;
}
