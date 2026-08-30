import Link from "next/link";
import { getCities, getHospitalsByCity } from "@/lib/data";

export default function HospitalsIndexPage() {
  const cities = getCities();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Browse hospitals by city
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        2,684 hospitals from the Bajaj Allianz cashless network directory, across six metros.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {cities.map((city) => {
          const count = getHospitalsByCity(city).length;
          return (
            <Link
              key={city}
              href={`/hospitals/${city.toLowerCase()}`}
              className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-blue-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">{city}</div>
              <div className="text-sm text-zinc-500">{count} hospitals</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
