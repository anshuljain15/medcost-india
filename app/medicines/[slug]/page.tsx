import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllMedicineGroups, getMedicineGroup, getMedicinesMeta } from "@/lib/medicines";
import MedicineDetailView from "@/components/MedicineDetailView";

export function generateStaticParams() {
  return getAllMedicineGroups().map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = getMedicineGroup(slug);
  if (!group) return { title: "Medicine not found" };
  const form = group.form === "tablet" ? "tablets" : "capsules";
  return {
    title: `${group.title} ${form}: Jan Aushadhi and brand prices`,
    description: `The Jan Aushadhi generic, the NPPA ceiling price and listed brand MRPs for ${group.title} ${form}, each with its source and date.`,
  };
}

export default async function MedicineDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = getMedicineGroup(slug);
  if (!group) notFound();

  // One group and the small meta block cross to the client; lib/medicines.ts
  // (and medicines.json) stay on the server.
  return <MedicineDetailView group={group} meta={getMedicinesMeta()} />;
}
