import { Suspense } from "react";
import { getMedicinesMeta } from "@/lib/medicines";
import KendraFinder from "@/components/KendraFinder";

export default function KendrasPage() {
  const { kendras } = getMedicinesMeta();
  // KendraFinder reads ?pin= with useSearchParams, which static export
  // requires inside a Suspense boundary.
  return (
    <Suspense>
      <KendraFinder snapshotDate={kendras.snapshotDate} total={kendras.count} />
    </Suspense>
  );
}
