export type CghsRate = {
  code: string;
  name: string;
  specialty: string;
  nabh: boolean;
  generalWard: string | null;
  semiPrivateWard: string | null;
  privateWard: string | null;
};

export type ProcedureHospitalPrice = {
  hospitalName: string;
  hospitalSlug: string | null;
  min: number | null;
  max: number | null;
  avg: number | null;
};

export type Procedure = {
  slug: string;
  name: string;
  cityLow: number | null;
  cityHigh: number | null;
  hospitalPrices: ProcedureHospitalPrice[];
  cghsReference: CghsRate | null;
  source: string;
  sourceUrl: string;
};

export type Hospital = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string;
  state: string;
  pincode: string | null;
  phone: string | null;
  emails: string | null;
  networkType: string | null;
  bedCount: string | null;
  icuBeds: string | null;
  rohiniCode: string | null;
  lat: number | null;
  lon: number | null;
  totalDoctors: string | null;
  totalNurses: string | null;
  nabhFlag: string | null;
};

export type HospitalReview = {
  author: string;
  rating: number | null;
  text: string;
  publishedAt: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  reviewUrl: string | null;
};

export type HospitalReviews = {
  hospitalSlug: string;
  rating: number | null;
  reviewCount: number | null;
  placeId: string | null;
  googleMapsUrl: string | null;
  photos: string[];
  topReviews: HospitalReview[];
  /** Written by data-pipeline/build_review_summaries.py; null until that runs. */
  summary: string | null;
  summaryModel: string | null;
  fetchedAt: string | null;
};

// ---- Medicines (data-pipeline/build_medicines.py -> data/generated/medicines.json)
// A group is every product with the SAME salts, strengths, form and release
// type -- see the decisions in data-pipeline/medicine_parse.py. Prices are per
// tablet/capsule so pack sizes compare; every one carries its source's date.

export type MedicineForm = "tablet" | "capsule";
export type MedicineRelease =
  | "standard"
  | "modified"
  | "dispersible"
  | "mouth-dissolving"
  | "chewable"
  | "effervescent";

export type JanAushadhiProduct = {
  drugCode: string;
  name: string;
  unitSize: string;
  /** null when PMBJP lists the product with MRP 0 (no price published). */
  mrp: number | null;
  perUnit: number | null;
};

export type NppaCeiling = {
  formulation: string;
  dosage: string;
  /** Per tablet/capsule, EXCLUDING GST. */
  ceilingPrice: number;
  soNumber: string;
  soDate: string;
  nlemVersion: number | null;
};

export type MedicineBrand = {
  name: string;
  manufacturer: string | null;
  packLabel: string;
  price: number | null;
  perUnit: number | null;
};

export type MedicineGroupLink = { slug: string; title: string };

export type MedicineGroup = {
  slug: string;
  title: string;
  salts: { name: string; strength: string }[];
  form: MedicineForm;
  release: MedicineRelease;
  janAushadhi: JanAushadhiProduct[];
  nppaCeiling: NppaCeiling | null;
  /** Cheapest brands only (capped); brandCount is the full number. */
  brands: MedicineBrand[];
  brandCount: number;
  brandPerUnit: { min: number; median: number; max: number } | null;
  relatedStrengths: MedicineGroupLink[];
  relatedExtraSalt: MedicineGroupLink[];
};

/**
 * The reference prices the bill checker needs for one group, sliced from
 * MedicineGroup on the server so the browser never gets medicines.json.
 */
export type MedicineRef = {
  slug: string;
  title: string;
  form: MedicineForm;
  /** Cheapest Jan Aushadhi per unit with a published price. */
  jaPerUnit: number | null;
  nppaCeiling: { price: number; soNumber: string; soDate: string } | null;
};

export type MedicinesMeta = {
  janAushadhi: { snapshotDate: string; url: string };
  nppa: { exportDate: string | null; url: string };
  brands: { name: string; url: string; license: string; snapshotDate: string };
  kendras: { snapshotDate: string | null; count: number };
};

/** One PMBJP store. The operator's personal name is deliberately not stored. */
export type JanAushadhiKendra = {
  code: string;
  address: string | null;
  district: string | null;
  state: string;
  pincode: string | null;
};

/**
 * Retrieval dates for sources whose snapshot carries none of its own
 * (data/source-dates.json). ISO "YYYY-MM-DD" or "YYYY-MM", filled in by hand by
 * the data owner. null means "date not recorded" and the UI says exactly that:
 * a date is never inferred from file times or guessed.
 */
export type SourceDates = {
  /** HexaHealth market estimates (procedures.json). */
  hexahealth: string | null;
  /** CGHS rate list (cghs_rates.json and each procedure's cghsReference). */
  cghs: string | null;
  /** Hospital directory (hospitals.json). */
  directory: string | null;
};
