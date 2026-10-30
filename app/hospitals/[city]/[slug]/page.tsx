import { notFound } from "next/navigation";
import { getAllSlugs, getHospitalBySlug, getProceduresAtHospital } from "@/lib/data";
import { getReviewsForHospital } from "@/lib/reviews";
import { getKendrasNearPincode } from "@/lib/medicines";
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
  // Loaded here, in the server component, and handed down as a prop: importing
  // lib/reviews.ts from the client view would ship every hospital's reviews
  // to every visitor.
  const reviews = city === "bangalore" ? getReviewsForHospital(slug) : null;
  // Same rule as reviews: only this hospital's handful of stores reaches the client.
  const kendras = getKendrasNearPincode(hospital.pincode);

  return (
    <HospitalDetailView
      hospital={hospital}
      citySlug={city}
      procedures={procedures}
      reviews={reviews}
      kendras={kendras}
    />
  );
}
