import { getAllProcedures } from "@/lib/data";
import QuoteCheckView from "@/components/QuoteCheckView";

export const metadata = {
  title: "Check a hospital quote | MedCost India",
  description:
    "Compare a hospital's estimate with the Bangalore market range, hospital-wise prices and the CGHS government rate.",
};

export default function CheckQuotePage() {
  return <QuoteCheckView procedures={getAllProcedures()} />;
}
