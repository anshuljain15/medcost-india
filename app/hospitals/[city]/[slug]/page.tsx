import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSlugs, getHospitalBySlug } from "@/lib/data";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/hospitals/${city}`} className="text-sm text-blue-600 hover:underline">
        &larr; Back to {hospital.city}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {hospital.name}
      </h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">{hospital.address}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label="Network type" value={hospital.networkType} />
        <Field label="Bed count" value={hospital.bedCount} />
        <Field label="ICU beds" value={hospital.icuBeds} />
        <Field label="Phone" value={hospital.phone} />
        <Field label="Pincode" value={hospital.pincode} />
        <Field label="Rohini code" value={hospital.rohiniCode} />
      </dl>

      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        Procedure pricing for this hospital isn&apos;t available yet — the pricing layer (CGHS
        reference rates, market estimates, and hospital-specific ranges) is being built for
        Bangalore first. Check back soon.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-zinc-900 dark:text-zinc-50">{value ?? "—"}</dd>
    </div>
  );
}
