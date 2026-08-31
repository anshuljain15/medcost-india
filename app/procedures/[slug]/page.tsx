import { notFound } from "next/navigation";
import { getAllProcedures, getProcedureBySlug } from "@/lib/data";
import ProcedureDetailView from "@/components/ProcedureDetailView";

export function generateStaticParams() {
  return getAllProcedures().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const procedure = getProcedureBySlug(slug);
  if (!procedure) notFound();

  return <ProcedureDetailView procedure={procedure} />;
}
