import reviewsJson from "@/data/generated/reviews.json";
import type { HospitalReviews } from "./types";

// Keyed by hospital slug. Bangalore-only for now, and only hospitals that
// cleared the strict name+location match in data-pipeline/build_reviews.py —
// an absent slug means "we are not confident these reviews are this hospital's",
// which is a supported, visible state.
const reviews = reviewsJson as Record<string, HospitalReviews>;

/**
 * Call this from a SERVER component only, and pass the single result down as a
 * prop. Importing this module from a "use client" component pulls every
 * hospital's reviews into the browser bundle — the weight problem CLAUDE.md
 * documents for hospitals.json.
 */
export function getReviewsForHospital(slug: string): HospitalReviews | null {
  return reviews[slug] ?? null;
}
