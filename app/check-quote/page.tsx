import type { Metadata } from "next";
import { getAllProcedures, getSourceDates } from "@/lib/data";
import { CGHS_SOURCE_URL } from "@/lib/cghs";
import { cghsGst, parseCghsAmount } from "@/lib/format";
import QuoteCheckView, { type QuoteProcedure } from "@/components/QuoteCheckView";

export const metadata: Metadata = {
  title: "Check a hospital quote or bill",
  description:
    "Compare a hospital's quote or final bill with the Bangalore market estimate, hospital-wise prices and the government (CGHS) rate.",
};

// Server page: the checker gets a slim row per procedure (no hospital names),
// with CGHS ward amounts already parsed from the scraped strings. lib/data.ts
// has already dropped hospital rows whose typical price falls outside their
// own range, so "{below} of {n} hospitals" never counts one.
export default function CheckQuotePage() {
  const procedures: QuoteProcedure[] = getAllProcedures().map((p) => ({
    slug: p.slug,
    name: p.name,
    low: p.cityLow,
    high: p.cityHigh,
    sourceUrl: p.sourceUrl,
    prices: p.hospitalPrices.map((h) => [h.min, h.avg]),
    cghs: p.cghsReference
      ? {
          name: p.cghsReference.name,
          code: p.cghsReference.code,
          nabh: p.cghsReference.nabh,
          general: parseCghsAmount(p.cghsReference.generalWard),
          semiPrivate: parseCghsAmount(p.cghsReference.semiPrivateWard),
          private: parseCghsAmount(p.cghsReference.privateWard),
          // One marker per row: the three wards of a CGHS row carry the same one.
          gst: cghsGst(
            p.cghsReference.generalWard ?? p.cghsReference.semiPrivateWard ?? p.cghsReference.privateWard
          ),
        }
      : null,
  }));
  const dates = getSourceDates();

  return (
    <QuoteCheckView
      procedures={procedures}
      hexahealthDate={dates.hexahealth}
      cghsDate={dates.cghs}
      cghsUrl={CGHS_SOURCE_URL}
    />
  );
}
