import type { Metadata } from "next";
import { getAllProcedures, getSourceDates } from "@/lib/data";
import { getCghsLineItemCount } from "@/lib/cghs";
import ProcedureListView, { type ProcedureListRow } from "@/components/ProcedureListView";

export const metadata: Metadata = {
  title: "Treatment costs in Bangalore",
  description:
    "Market estimates for treatments in Bangalore from HexaHealth, with hospital-wise prices and the government (CGHS) rate where we have a confident match.",
};

// Server page: the client list gets one slim row per procedure, never the
// hospital-wise prices or the CGHS rows behind them. The hospital count is of
// the rows the procedure page shows (lib/data.ts drops inconsistent ones).
export default function ProceduresPage() {
  const rows: ProcedureListRow[] = getAllProcedures().map((p) => [
    p.slug,
    p.name,
    p.cityLow,
    p.cityHigh,
    p.hospitalPrices.length,
    p.cghsReference !== null,
  ]);

  return (
    <ProcedureListView rows={rows} date={getSourceDates().hexahealth} cghsLineItems={getCghsLineItemCount()} />
  );
}
