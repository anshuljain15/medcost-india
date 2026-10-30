import { notFound } from "next/navigation";
import { getAllMedicineGroups, getMedicineGroup, getMedicinesMeta } from "@/lib/medicines";
import MedicineDetailView from "@/components/MedicineDetailView";

export function generateStaticParams() {
  return getAllMedicineGroups().map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = getMedicineGroup(slug);
  if (!group) notFound();

  return <MedicineDetailView group={group} meta={getMedicinesMeta()} />;
}
