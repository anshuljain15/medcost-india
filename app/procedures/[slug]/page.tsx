import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProcedures, getProcedureBySlug, getSourceDates } from "@/lib/data";
import { CGHS_SOURCE_URL } from "@/lib/cghs";
import type { ProcedureHospitalPrice } from "@/lib/types";
import ProcedureDetailView from "@/components/ProcedureDetailView";

export function generateStaticParams() {
  return getAllProcedures().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const procedure = getProcedureBySlug(slug);
  if (!procedure) return { title: "Treatment cost in Bangalore" };
  return {
    title: `${procedure.name} cost in Bangalore`,
    description: `Market estimate for ${procedure.name} in Bangalore from HexaHealth, with hospital-wise prices and the government (CGHS) rate where we have a confident match.`,
  };
}

/** Lowest typical (avg) price first; rows without an avg go last, in source order. */
function byTypical(a: ProcedureHospitalPrice, b: ProcedureHospitalPrice): number {
  if (a.avg === null && b.avg === null) return 0;
  if (a.avg === null) return 1;
  if (b.avg === null) return -1;
  return a.avg - b.avg;
}

export default async function ProcedureDetailPage({ params }: Params) {
  const { slug } = await params;
  const procedure = getProcedureBySlug(slug);
  if (!procedure) notFound();

  const dates = getSourceDates();

  // lib/data.ts has already dropped rows whose typical price falls outside
  // their own range (isConsistentHospitalPrice); only the order is set here.
  return (
    <ProcedureDetailView
      procedure={{ ...procedure, hospitalPrices: [...procedure.hospitalPrices].sort(byTypical) }}
      hexahealthDate={dates.hexahealth}
      cghsDate={dates.cghs}
      cghsUrl={CGHS_SOURCE_URL}
    />
  );
}
