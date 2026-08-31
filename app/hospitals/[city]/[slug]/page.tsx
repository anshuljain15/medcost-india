import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSlugs, getHospitalBySlug, getProceduresAtHospital } from "@/lib/data";
import { formatINR } from "@/lib/format";

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/hospitals/${city}`} className="text-sm text-brand-700 hover:underline">
        &larr; Back to {hospital.city}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-ink-900">{hospital.name}</h1>
      <p className="mt-1 text-ink-700">{hospital.address}</p>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Field label="Network type" value={hospital.networkType} />
        <Field label="Bed count" value={hospital.bedCount} />
        <Field label="ICU beds" value={hospital.icuBeds} />
        <Field label="Phone" value={hospital.phone} />
        <Field label="Pincode" value={hospital.pincode} />
        <Field label="Rohini code" value={hospital.rohiniCode} />
      </dl>

      {procedures.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink-900">Procedures priced at this hospital</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Procedure</th>
                  <th className="px-4 py-3">Min</th>
                  <th className="px-4 py-3">Avg</th>
                  <th className="px-4 py-3">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {procedures.map((p) => {
                  const hp = p.hospitalPrices.find((x) => x.hospitalSlug === slug)!;
                  return (
                    <tr key={p.slug}>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        <Link href={`/procedures/${p.slug}`} className="text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{formatINR(hp.min)}</td>
                      <td className="px-4 py-3">{formatINR(hp.avg)}</td>
                      <td className="px-4 py-3">{formatINR(hp.max)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-500">
          No procedure pricing linked to this specific hospital yet — browse{" "}
          <Link href="/procedures" className="underline">
            all priced procedures
          </Link>{" "}
          for Bangalore market ranges.
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-900">{value ?? "—"}</dd>
    </div>
  );
}
