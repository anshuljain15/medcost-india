import { getCghsRates, getCghsSpecialties } from "@/lib/cghs";
import RateExplorer from "@/components/RateExplorer";

export default function RatesPage() {
  const rates = getCghsRates();
  const specialties = getCghsSpecialties();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Rate Explorer</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">
        CGHS government reference rates — Tier I (Bangalore)
      </h1>
      <p className="mt-2 max-w-3xl text-ink-700">
        {rates.length.toLocaleString("en-IN")} line items across {specialties.length} specialties,
        pulled directly from the Central Government Health Scheme rate list. These are
        reimbursement rates the government pays, not necessarily what a private hospital
        charges — but they&apos;re the most consistent public benchmark available for India.
      </p>
      <RateExplorer rates={rates} specialties={specialties} />
    </div>
  );
}
