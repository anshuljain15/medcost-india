import { notFound } from "next/navigation";
import { getCities, getHospitalsByCity } from "@/lib/data";
import CityView from "@/components/CityView";

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

  return <CityView cityLabel={hospitals[0].city} citySlug={city} hospitals={hospitals} />;
}
