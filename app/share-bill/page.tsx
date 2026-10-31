import { getAllHospitals, getAllProcedures } from "@/lib/data";
import ShareBillView from "@/components/ShareBillView";

export const metadata = {
  title: "Share your bill | MedCost India",
  description:
    "Anonymously share what a hospital quoted and what you finally paid, so the next family knows what to expect. No login, no upload.",
};

export default function ShareBillPage() {
  // Server component: only names and slugs cross to the client, not the
  // 1.5 MB hospital directory.
  const procedures = getAllProcedures()
    .map((p) => ({ slug: p.slug, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const hospitals = getAllHospitals().map((h) => ({ slug: h.slug, name: h.name, city: h.city }));
  return <ShareBillView procedures={procedures} hospitals={hospitals} />;
}
