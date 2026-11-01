import type { Metadata } from "next";
import { getMedicinesMeta } from "@/lib/medicines";
import KendraFinder from "@/components/KendraFinder";

export const metadata: Metadata = {
  title: "Find a Jan Aushadhi store",
  description:
    "Find Pradhan Mantri Bhartiya Janaushadhi Kendras by PIN code: government stores that sell generic medicines at fixed low prices.",
};

export default function KendrasPage() {
  const { kendras } = getMedicinesMeta();
  // Only the date and the store count cross to the client; the stores
  // themselves are fetched per postal area from public/data/kendras/.
  // KendraFinder reads ?pin= with useSearchParams inside its own Suspense
  // boundary, so the heading and form are still in the static HTML.
  return <KendraFinder snapshotDate={kendras.snapshotDate} total={kendras.count} />;
}
