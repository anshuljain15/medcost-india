import { notFound } from "next/navigation";
import { getAllSlugs, getHospitalBySlug, getProceduresAtHospital } from "@/lib/data";
import HospitalDetailView from "@/components/HospitalDetailView";

export function generateStaticParams() {
  return getAllSlugs();
}

export const dynamicParams = false;

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  const hospital = getHospitalBySlug(city, slug);
  if (!hospital) notFound();

  const procedures = city === "bangalore" ? getProceduresAtHospital(slug) : [];

  return <HospitalDetailView hospital={hospital} citySlug={city} procedures={procedures} />;
}
