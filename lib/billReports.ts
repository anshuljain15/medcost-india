// Browser-side access to patient-reported bills in Supabase
// (supabase/migrations/0001_bill_reports.sql). Plain fetch to PostgREST RPCs
// rather than supabase-js: two calls don't justify the bundle. The key is the
// public anon/publishable key -- the table is closed to it, and only the two
// SECURITY DEFINER functions below are callable. Works the same on GitHub
// Pages and Vercel because nothing here needs our own server.

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase now calls the public key "publishable"; older projects say "anon".
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const BILL_SHARING_ENABLED = URL_ !== "" && KEY !== "";

export const CATEGORIES = [
  "cardiac",
  "orthopaedic",
  "maternity",
  "general_surgery",
  "eye",
  "dental",
  "cancer",
  "kidney_urology",
  "neuro",
  "gynae",
  "ent",
  "gastro",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const COMPONENTS = [
  "room",
  "icu",
  "doctor",
  "ot",
  "implants",
  "medicines",
  "consumables",
  "tests",
  "other",
] as const;
export type Component = (typeof COMPONENTS)[number];

export const PAYMENTS = ["self", "insurance", "cghs", "pmjay", "state_scheme", "employer", "other"] as const;
export type Payment = (typeof PAYMENTS)[number];

export type HospitalType = "private" | "government" | "trust" | "unknown";
export type RoomType = "general" | "semi_private" | "private" | "none";

export type BillReport = {
  browser_id: string;
  city: string;
  category: Category;
  procedure_slug: string | null;
  procedure_other: string | null;
  hospital_slug: string | null;
  hospital_other: string | null;
  hospital_type: HospitalType;
  /** First day of the month, "2026-09-01". */
  treated_month: string;
  admitted: boolean;
  stay_days: number | null;
  icu_days: number | null;
  room_type: RoomType | null;
  complications: "no" | "yes" | "unsure" | null;
  payment: Payment;
  quoted_amount: number | null;
  final_amount: number;
  covered_amount: number | null;
  components: Partial<Record<Component, number>>;
  surprises: { item: string; amount: number }[];
};

export type BillStatGroup = { city: string; procedure: string; n: number; p25: number; median: number; p75: number };
export type BillStats = {
  approved: number;
  unlocked: BillStatGroup[];
  progress: { city: string; procedure: string; n: number }[];
};

/** Mirrors the HAVING clause in bill_stats(); shown to users as the unlock rule. */
export const UNLOCK_BILLS = 5;
export const UNLOCK_BROWSERS = 3;

/** Mirrors the stay_days / icu_days check constraints (0 to 365) on bill_reports. */
export const MAX_STAY_DAYS = 365;

/** The share.submitError.* message shown for a failed submitBill(). */
export type SubmitErrorKind = "rate_limited" | "busy" | "invalid" | "generic";

/**
 * rate_limited and busy are raised by submit_bill(). Its invalid_* /
 * components_exceed_total exceptions and a table check-constraint violation
 * mean the database refused one of the answers (e.g. invalid_month while the
 * database's date is still last month), so the person is told to check their
 * answers rather than their connection. Anything else (network, http_5xx) is
 * generic.
 */
export function submitErrorKind(err: unknown): SubmitErrorKind {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "rate_limited" || msg === "busy") return msg;
  if (/^invalid_|^components_exceed_total$|violates check constraint/.test(msg)) return "invalid";
  return "generic";
}

async function rpc<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // PostgREST returns {message} with our raise exception text
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message ?? `http_${res.status}`);
  }
  return (await res.json()) as T;
}

/** Returns the new report's id. Throws Error("rate_limited" | "busy" | ...). */
export function submitBill(report: BillReport): Promise<string> {
  return rpc<string>("submit_bill", { report });
}

export function getBillStats(): Promise<BillStats> {
  return rpc<BillStats>("bill_stats", {});
}

const BROWSER_ID_KEY = "medcost.browserId";

/**
 * A random id kept in localStorage so the server can rate-limit and count
 * distinct submitters. Not tied to a person; clearing site data resets it.
 */
export function getBrowserId(): string {
  try {
    const existing = localStorage.getItem(BROWSER_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
