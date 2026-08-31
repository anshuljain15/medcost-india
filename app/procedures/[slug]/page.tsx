import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProcedures, getProcedureBySlug } from "@/lib/data";
import { formatINR } from "@/lib/format";

export function generateStaticParams() {
  return getAllProcedures().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export default async function ProcedureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const procedure = getProcedureBySlug(slug);
  if (!procedure) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/procedures" className="text-sm text-brand-700 hover:underline">
        &larr; All procedures
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-ink-900">{procedure.name} in Bangalore</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-100 bg-ink-50 p-6">
          <div className="text-xs uppercase tracking-wide text-ink-500">Market range</div>
          <div className="mt-1 text-2xl font-bold text-ink-900">
            {formatINR(procedure.cityLow)} – {formatINR(procedure.cityHigh)}
          </div>
          <div className="mt-2 text-xs text-ink-500">
            Source:{" "}
            <a href={procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              HexaHealth
            </a>{" "}
            — editorial market estimate, not a billed amount.
          </div>
        </div>

        {procedure.cghsReference ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
            <div className="text-xs uppercase tracking-wide text-brand-800">
              Government (CGHS) reference — Tier I
            </div>
            <div className="mt-1 text-2xl font-bold text-ink-900">
              {formatINR(Number(procedure.cghsReference.generalWard))}
              <span className="ml-2 text-sm font-normal text-ink-500">general ward, NABH</span>
            </div>
            <div className="mt-2 text-xs text-ink-700">
              Matched CGHS line item: <strong>{procedure.cghsReference.name}</strong> ({procedure.cghsReference.code}).
              Semi-private {formatINR(Number(procedure.cghsReference.semiPrivateWard))}, private{" "}
              {formatINR(Number(procedure.cghsReference.privateWard))}.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-300 p-6 text-sm text-ink-500">
            No confident CGHS government reference match for this procedure. We only show a match
            when we&apos;re sure it refers to the same procedure — see{" "}
            <Link href="/methodology" className="underline">
              methodology
            </Link>
            .
          </div>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink-900">Hospital-wise price comparison</h2>
        {procedure.hospitalPrices.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            No hospital-specific breakdown is available for this procedure yet — only the city-wide
            market range above.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Hospital</th>
                  <th className="px-4 py-3">Min</th>
                  <th className="px-4 py-3">Avg</th>
                  <th className="px-4 py-3">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {procedure.hospitalPrices.map((h, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {h.hospitalSlug ? (
                        <Link href={`/hospitals/bangalore/${h.hospitalSlug}`} className="text-brand-700 hover:underline">
                          {h.hospitalName}
                        </Link>
                      ) : (
                        h.hospitalName
                      )}
                    </td>
                    <td className="px-4 py-3">{formatINR(h.min)}</td>
                    <td className="px-4 py-3">{formatINR(h.avg)}</td>
                    <td className="px-4 py-3">{formatINR(h.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-ink-500">
          Source:{" "}
          <a href={procedure.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {procedure.sourceUrl}
          </a>
          . These are editorial market estimates, not confirmed billed amounts — treat them as a
          starting point for comparison, not a quote.
        </p>
      </section>
    </div>
  );
}
