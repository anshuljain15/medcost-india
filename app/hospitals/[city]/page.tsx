import { notFound } from "next/navigation";
import { getCities, getHospitalsByCity } from "@/lib/data";
import HospitalListClient from "@/components/HospitalListClient";
import HospitalMap from "@/components/HospitalMapLoader";

export function generateStaticParams() {
  return getCities().map((city) => ({ city: city.toLowerCase() }));
}

export const dynamicParams = false;

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const hospitals = getHospitalsByCity(city);
  if (hospitals.length === 0) notFound();
  const cityLabel = hospitals[0].city;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-900">{cityLabel} network hospitals</h1>
      <p className="mt-1 text-sm text-ink-500">
        {hospitals.length} hospitals in the Bajaj Allianz cashless network.
      </p>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="h-[520px] overflow-hidden rounded-xl border border-ink-100">
          <HospitalMap hospitals={hospitals} />
        </div>
        <HospitalListClient hospitals={hospitals} citySlug={city} />
      </div>
    </div>
  );
}
