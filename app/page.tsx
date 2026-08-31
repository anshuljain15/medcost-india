import Link from "next/link";
import { getAllProcedures, getCities } from "@/lib/data";
import { formatINR } from "@/lib/format";
import ProcedureSearch from "@/components/ProcedureSearch";

const FEATURES = [
  {
    n: "01",
    title: "Government reference rates",
    body: "Every priced procedure is checked against the CGHS Tier I rate — the same benchmark the government uses for its own hospital reimbursements.",
  },
  {
    n: "02",
    title: "Real hospital-wise ranges",
    body: "Where the data exists, prices are shown per hospital, not just per city — so you can see how one hospital compares to another for the same procedure.",
  },
  {
    n: "03",
    title: "No point claims, ever",
    body: "Every number is a range with a visible source and date. We never publish a single made-up figure for what a hospital “charges.”",
  },
  {
    n: "04",
    title: "One rate per procedure",
    body: "Unlike US price transparency data, Indian pricing isn’t split by insurance plan or payer — just a procedure and a rate, which is what we show.",
  },
  {
    n: "05",
    title: "2,684 network hospitals",
    body: "A directory of cashless-network hospitals across six metros, mapped and searchable, with bed and ICU capacity where available.",
  },
  {
    n: "06",
    title: "Built to be corrected",
    body: "Every hospital and rate page carries a methodology link and a correction channel. If something’s wrong, we want to know.",
  },
];

export default function Home() {
  const procedures = getAllProcedures();
  const cities = getCities();

  const featured = procedures.find((p) => p.slug === "kidney-transplant") ?? procedures[0];

  return (
    <div>
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white px-4 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="rounded-full bg-brand-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
            Bangalore pricing pilot
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
            Know what a procedure should cost, before you walk into a hospital.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-700">
            Search a procedure to see a government reference rate, a market range, and — where we
            have it — a hospital-by-hospital price comparison.
          </p>
          <div className="mt-8 w-full">
            <ProcedureSearch procedures={procedures} />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-ink-500">
            <span>{procedures.length} procedures priced</span>
            <span>2,684 network hospitals</span>
            <span>{cities.length} cities</span>
          </div>
        </div>
      </section>

      {featured && (
        <section className="border-b border-ink-100 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              Example — real data
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink-900">{featured.name} in Bangalore</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">Market range</div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {formatINR(featured.cityLow)} – {formatINR(featured.cityHigh)}
                </div>
                <div className="mt-1 text-xs text-ink-500">Source: HexaHealth</div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">Hospitals priced</div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {featured.hospitalPrices.length}
                </div>
                <div className="mt-1 text-xs text-ink-500">Named hospitals in this range</div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-ink-50 p-5">
                <div className="text-xs uppercase tracking-wide text-ink-500">
                  Government (CGHS) reference
                </div>
                <div className="mt-1 text-xl font-bold text-ink-900">
                  {featured.cghsReference ? formatINR(Number(featured.cghsReference.generalWard)) : "Not available"}
                </div>
                <div className="mt-1 text-xs text-ink-500">Tier I, NABH, general ward</div>
              </div>
            </div>
            <Link
              href={`/procedures/${featured.slug}`}
              className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:underline"
            >
              See the full hospital comparison &rarr;
            </Link>
          </div>
        </section>
      )}

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-ink-900">How this is different from a listing site</h2>
          <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n}>
                <div className="text-sm font-bold text-brand-600">{f.n}</div>
                <div className="mt-2 font-semibold text-ink-900">{f.title}</div>
                <p className="mt-1 text-sm text-ink-700">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-ink-900 px-4 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold">Browse the full hospital directory</h2>
            <p className="mt-2 max-w-md text-ink-300">
              2,684 network hospitals across Bangalore, Delhi, Mumbai, Pune, Chennai and Hyderabad —
              mapped, searchable, and free to browse.
            </p>
          </div>
          <Link
            href="/hospitals"
            className="shrink-0 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 hover:bg-brand-400"
          >
            Browse hospitals
          </Link>
        </div>
      </section>
    </div>
  );
}
