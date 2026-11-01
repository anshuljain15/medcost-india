import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllSlugs, getHospitalBySlug, getProceduresAtHospital, getSourceDates } from "@/lib/data";
import { getReviewsForHospital } from "@/lib/reviews";
import { getKendrasNearPincode } from "@/lib/medicines";
import HospitalDetailView, { type HospitalPriceRow } from "@/components/HospitalDetailView";

export function generateStaticParams() {
  return getAllSlugs();
}

export const dynamicParams = false;

type Params = { params: Promise<{ city: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { city, slug } = await params;
  const hospital = getHospitalBySlug(city, slug);
  if (!hospital) return { title: "Hospital" };
  return {
    title: `${hospital.name}, ${hospital.city}`,
    description: `Address, phone and nearby Jan Aushadhi stores for ${hospital.name}, ${hospital.city}.`,
  };
}

export default async function HospitalDetailPage({ params }: Params) {
  const { city, slug } = await params;
  const hospital = getHospitalBySlug(city, slug);
  if (!hospital) notFound();

  // The Bangalore gate: procedure prices exist only for Bangalore, and a slug
  // is unique only within its city. If pricing reaches a second city,
  // build_procedures.py's build_hospital_index must change with this line.
  const isBangalore = city === "bangalore";
  // Only this hospital's own price per treatment reaches the client, not
  // every procedure's full hospital list.
  const prices: HospitalPriceRow[] = isBangalore
    ? getProceduresAtHospital(slug).flatMap((p) => {
        const hp = p.hospitalPrices.find((x) => x.hospitalSlug === slug);
        return hp ? [{ slug: p.slug, name: p.name, min: hp.min, max: hp.max, avg: hp.avg }] : [];
      })
    : [];
  // Loaded here, in the server component, and handed down as a prop: importing
  // lib/reviews.ts from the client view would ship every hospital's reviews
  // to every visitor. Absent means "not confident it is this hospital", and
  // the page then shows no review section at all.
  const reviews = isBangalore ? getReviewsForHospital(slug) : null;
  // Same rule as reviews: only this hospital's handful of stores reaches the client.
  const kendras = getKendrasNearPincode(hospital.pincode);
  const dates = getSourceDates();

  return (
    <HospitalDetailView
      hospital={hospital}
      citySlug={city}
      prices={prices}
      reviews={reviews}
      kendras={kendras}
      dates={{ hexahealth: dates.hexahealth, directory: dates.directory }}
    />
  );
}
