import medicinesJson from "@/data/generated/medicines.json";
import kendrasJson from "@/data/generated/kendras.json";
import type { JanAushadhiKendra, MedicineGroup, MedicineRef, MedicinesMeta } from "./types";

// SERVER components only, like lib/reviews.ts: medicines.json is ~6 MB and
// kendras.json ~3 MB. Pages pass one group / one slice down as props; the
// browser's search box and Kendra finder read the small shards under
// public/data/ through lib/medicineShards.ts instead.
const data = medicinesJson as { meta: MedicinesMeta; groups: MedicineGroup[] };
const kendras = kendrasJson as JanAushadhiKendra[];

const groupsBySlug = new Map(data.groups.map((g) => [g.slug, g]));

export function getAllMedicineGroups(): MedicineGroup[] {
  return data.groups;
}

export function getMedicineGroup(slug: string): MedicineGroup | undefined {
  return groupsBySlug.get(slug);
}

/** Reference prices only (~1,400 small rows) for the bill checker's props. */
export function getMedicineRefs(): MedicineRef[] {
  return data.groups.map((g) => {
    const ja = g.janAushadhi.map((p) => p.perUnit).filter((n): n is number => n !== null);
    return {
      slug: g.slug,
      title: g.title,
      form: g.form,
      jaPerUnit: ja.length > 0 ? Math.min(...ja) : null,
      nppaCeiling: g.nppaCeiling
        ? { price: g.nppaCeiling.ceilingPrice, soNumber: g.nppaCeiling.soNumber, soDate: g.nppaCeiling.soDate }
        : null,
    };
  });
}

export function getMedicinesMeta(): MedicinesMeta {
  return data.meta;
}

/**
 * Kendras in the same PIN first, then others in the same 3-digit postal
 * sorting district, nearest PIN number first. PIN proximity is a coarse
 * proxy for distance -- the store list has no coordinates -- so the UI labels
 * the second tier "same postal area", not "nearby".
 */
export function getKendrasNearPincode(
  pincode: string | null,
  limit = 6
): { samePin: JanAushadhiKendra[]; samePostalArea: JanAushadhiKendra[] } {
  if (!pincode || !/^[1-9]\d{5}$/.test(pincode)) return { samePin: [], samePostalArea: [] };
  const pin = Number(pincode);
  const area = kendras.filter((k) => k.pincode?.startsWith(pincode.slice(0, 3)));
  const samePin = area.filter((k) => k.pincode === pincode).slice(0, limit);
  const samePostalArea = area
    .filter((k) => k.pincode !== pincode)
    .sort((a, b) => Math.abs(Number(a.pincode) - pin) - Math.abs(Number(b.pincode) - pin))
    .slice(0, Math.max(0, limit - samePin.length));
  return { samePin, samePostalArea };
}
