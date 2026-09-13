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
