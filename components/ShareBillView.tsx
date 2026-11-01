"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BILL_SHARING_ENABLED,
  CATEGORIES,
  COMPONENTS,
  PAYMENTS,
  UNLOCK_BILLS,
  UNLOCK_BROWSERS,
  getBillStats,
  getBrowserId,
  submitBill,
  type BillReport,
  type BillStats,
  type Category,
  type Component,
  type HospitalType,
  type Payment,
  type RoomType,
} from "@/lib/billReports";
import { formatINR } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { GROUP_ORDER, procedureGroup } from "@/lib/procedureGroups";
import { synonymsFor } from "@/lib/search/synonyms";
import { loadHospitalIndex, loadProcedureIndex, type HospitalIndex, type ProcedureIndex } from "@/lib/staticData";
import ShareButton from "@/components/ShareButton";
import {
  ActionLink,
  Button,
  Callout,
  Card,
  ChoiceList,
  Combobox,
  DataText,
  ErrorSummary,
  Icon,
  IconButton,
  InsetGroup,
  ListRow,
  Money,
  MoneyField,
  MoneyRange,
  PageNotes,
  PageShell,
  PatientReported,
  SectionHeader,
  Select,
  Skeleton,
  StatTile,
  StepHeader,
  StickyActionBar,
  TextField,
  type ComboOption,
} from "@/components/ui";

// "Share your bill" (design spec §6 /share-bill, focus mode §2.5): an intro,
// five one-question screens and "Check your answers" ("Step n of 6"). No
// login, no upload, every amount typed by the person. The hospital is asked
// for but never shown publicly (see supabase/migrations/0001_bill_reports.sql);
// only city + procedure aggregates of approved bills come back, through
// bill_stats(), and they appear on the intro only, inside PatientReported.
//
// Weight: the page receives only the six city names. The procedure list and
// the 2,684-row hospital index are fetched from public/data/search when the
// screen that needs them is shown (lib/staticData.ts).
//
// Back button: every screen change pushes {shareStep} with a #step-n hash, and
// popstate steps back, so Android's back button returns to the previous
// question. The draft lives in sessionStorage until the bill is sent.

const OTHER = "__other__";
const TOTAL_STEPS = 6;
const REVIEW_STEP = 6;
const MAX_SURPRISES = 10;
const DRAFT_KEY = "medcost-share-draft";
const HOSPITAL_TYPES: HospitalType[] = ["private", "government", "trust", "unknown"];
const ROOM_TYPES: RoomType[] = ["general", "semi_private", "private", "none"];
const COMPLICATIONS = ["no", "yes", "unsure"] as const;
const STEP_TITLE = [
  "share.title",
  "share.stepQ.what",
  "share.stepQ.where",
  "share.stepQ.stay",
  "share.stepQ.money",
  "share.stepQ.breakdown",
  "share.stepQ.review",
];

type Surprise = { key: string; item: string; amount: string };

type Form = {
  procedure: string; // HexaHealth slug, OTHER, or ""
  procedureOther: string;
  category: Category | "";
  city: string; // directory display name ("Bangalore"), OTHER, or ""
  cityOther: string;
  hospitalPick: string; // directory slug, OTHER, or ""
  hospitalOther: string;
  hospitalType: HospitalType | "";
  month: string; // "01".."12"
  year: string;
  admitted: "yes" | "no" | "";
  stayDays: string;
  icuDays: string;
  roomType: RoomType | "";
  complications: (typeof COMPLICATIONS)[number] | "";
  payment: Payment | "";
  quoted: string; // digits only (MoneyField)
  final: string;
  covered: string;
  components: Partial<Record<Component, string>>;
  surprises: Surprise[];
  consent: boolean;
};

const EMPTY: Form = {
  procedure: "",
  procedureOther: "",
  category: "",
  city: "",
  cityOther: "",
  hospitalPick: "",
  hospitalOther: "",
  hospitalType: "",
  month: "",
  year: "",
  admitted: "",
  stayDays: "",
  icuDays: "",
  roomType: "",
  complications: "",
  payment: "",
  quoted: "",
  final: "",
  covered: "",
  components: {},
  surprises: [],
  consent: false,
};

type Problem = { fieldId: string; message: string };
type FocusTarget = "heading" | "summary" | "submitError" | { id: string };
type SubmitState = { kind: "idle" } | { kind: "sending" } | { kind: "done"; id: string } | { kind: "error"; code: string };
type StatsState = { kind: "loading" } | { kind: "none" } | { kind: "ready"; data: BillStats };

const money = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const int = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : null;
};
const digits = (s: string, max: number) => s.replace(/\D/g, "").slice(0, max);
const newKey = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const pathOnly = () => window.location.pathname + window.location.search;

function oneOf<T extends string>(v: unknown, list: readonly T[]): T | "" {
  return typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : "";
}
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** The saved draft, checked field by field (an older or edited copy must not break the form). */
function readDraft(): Form | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown> | null;
    if (!d || typeof d !== "object") return null;
    const components: Partial<Record<Component, string>> = {};
    const src = d.components && typeof d.components === "object" ? (d.components as Record<string, unknown>) : {};
    for (const c of COMPONENTS) if (typeof src[c] === "string") components[c] = digits(src[c] as string, 8);
    const surprises: Surprise[] = (Array.isArray(d.surprises) ? d.surprises : [])
      .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
      .slice(0, MAX_SURPRISES)
      .map((s) => ({ key: str(s.key, 40) || newKey(), item: str(s.item, 80), amount: digits(str(s.amount, 12), 8) }));
    return {
      procedure: str(d.procedure, 80),
      procedureOther: str(d.procedureOther, 120),
      category: oneOf(d.category, CATEGORIES),
      city: str(d.city, 60),
      cityOther: str(d.cityOther, 60),
      hospitalPick: str(d.hospitalPick, 120),
      hospitalOther: str(d.hospitalOther, 120),
      hospitalType: oneOf(d.hospitalType, HOSPITAL_TYPES),
      month: str(d.month, 2),
      year: str(d.year, 4),
      admitted: oneOf(d.admitted, ["yes", "no"] as const),
      stayDays: digits(str(d.stayDays, 3), 3),
      icuDays: digits(str(d.icuDays, 3), 3),
      roomType: oneOf(d.roomType, ROOM_TYPES),
      complications: oneOf(d.complications, COMPLICATIONS),
      payment: oneOf(d.payment, PAYMENTS),
      quoted: digits(str(d.quoted, 12), 8),
      final: digits(str(d.final, 12), 8),
      covered: digits(str(d.covered, 12), 8),
      components,
      surprises,
      consent: d.consent === true,
    };
  } catch {
    return null;
  }
}

function writeDraft(form: Form) {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  } catch {
    // storage full or blocked: the form still works, it just won't survive a reload
  }
}

function clearDraft() {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** bill_stats() output, made safe to render even if the response is malformed. */
function normaliseStats(d: unknown): BillStats {
  const s = (d && typeof d === "object" ? d : {}) as Partial<BillStats>;
  const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
  const named = (g: { city?: unknown; procedure?: unknown }) => typeof g.city === "string" && typeof g.procedure === "string";
  return {
    approved: num(s.approved) ? s.approved : 0,
    unlocked: (Array.isArray(s.unlocked) ? s.unlocked : []).filter(
      (g) => g && named(g) && num(g.n) && num(g.p25) && num(g.median) && num(g.p75)
    ),
    progress: (Array.isArray(s.progress) ? s.progress : []).filter((g) => g && named(g) && num(g.n)),
  };
}

/** The screen's question. tabIndex -1 so focus can move here when the screen changes. */
function ScreenTitle({ ref, children }: { ref?: React.Ref<HTMLHeadingElement>; children: React.ReactNode }) {
  return (
    <h1 ref={ref} tabIndex={-1} className="text-title1 text-label text-balance focus:outline-none">
      {children}
    </h1>
  );
}

/** A labelled group of fields (fieldset + legend + optional hint). */
function FieldGroup({
  id,
  legend,
  hint,
  children,
}: {
  id: string;
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="min-w-0" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="text-headline text-label">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-callout text-label-2">
          {hint}
        </p>
      )}
      <div className="mt-4 space-y-6">{children}</div>
    </fieldset>
  );
}

/** A field whose options are still being fetched. */
function FieldLoading({ label }: { label: string }) {
  return (
    <div>
      <p className="mb-1 text-headline text-label">{label}</p>
      <Skeleton />
    </div>
  );
}

export default function ShareBillView({ cities }: { cities: string[] }) {
  const { t, locale } = useTranslation();
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [kindEditing, setKindEditing] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const [stats, setStats] = useState<StatsState>(BILL_SHARING_ENABLED ? { kind: "loading" } : { kind: "none" });
  const [procIndex, setProcIndex] = useState<ProcedureIndex | null>(null);
  const [hospIndex, setHospIndex] = useState<HospitalIndex | null>(null);
  const [today] = useState(() => new Date());
  // Bumped to re-run the focus effect when nothing else re-renders (e.g. a
  // second Continue press with the same errors).
  const [, setFocusTick] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const returnToReview = useRef(false);
  const doneRef = useRef(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const hiData = locale === "hi" ? ("en" as const) : undefined;

  // ---- Restore a draft (and the screen, after a reload on #step-n) --------
  useEffect(() => {
    const draft = readDraft();
    const m = /^#step-([1-6])$/.exec(window.location.hash);
    // sessionStorage and the URL hash exist only in the browser, so they are
    // read after mount; the extra render is the price of no hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setForm(draft);
    const n = m && draft ? Number(m[1]) : 0;
    if (n) setStep(n);
    // Next's router patches history.pushState/replaceState in its own effect,
    // which runs after this child effect on hydration. Writing history now
    // would drop the router's state (and a later Back would reload the page),
    // so wait until the commit is done.
    const timer = window.setTimeout(() => {
      if (n) window.history.replaceState({ shareStep: n }, "", window.location.href);
      else if (window.location.hash) window.history.replaceState({ shareStep: 0 }, "", pathOnly());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ---- Browser / Android back and forward step through the screens --------
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const raw = (e.state as { shareStep?: unknown } | null)?.shareStep;
      let n = typeof raw === "number" && raw >= 1 && raw <= TOTAL_STEPS ? raw : 0;
      returnToReview.current = false;
      if (doneRef.current) {
        // Back from the thank-you screen: the form was sent and cleared, so go
        // to the intro rather than an empty question.
        doneRef.current = false;
        n = 0;
        window.history.replaceState({ shareStep: 0 }, "", pathOnly());
      }
      setSubmit((s) => (s.kind === "sending" ? s : { kind: "idle" }));
      setShowErrors(false);
      setKindEditing(false);
      pendingFocus.current = "heading";
      setStep(n);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ---- Keep the draft until the bill is sent ------------------------------
  useEffect(() => {
    if (form !== EMPTY && submit.kind !== "done") writeDraft(form);
  }, [form, submit.kind]);

  // ---- Public stats (intro only) -----------------------------------------
  useEffect(() => {
    if (!BILL_SHARING_ENABLED) return;
    let alive = true;
    getBillStats()
      .then((d) => alive && setStats({ kind: "ready", data: normaliseStats(d) }))
      .catch(() => alive && setStats({ kind: "none" }));
    return () => {
      alive = false;
    };
  }, []);

  // ---- Fetch the indexes when a screen needs them --------------------------
  const statsNeedNames =
    stats.kind === "ready" && (stats.data.unlocked.length > 0 || stats.data.progress.length > 0);
  const needProcedures = step >= 1 || statsNeedNames;
  useEffect(() => {
    if (!needProcedures || procIndex) return;
    let alive = true;
    loadProcedureIndex().then((ix) => alive && setProcIndex(ix));
    return () => {
      alive = false;
    };
  }, [needProcedures, procIndex]);

  const pickedSlug = form.city !== OTHER && form.hospitalPick !== OTHER ? form.hospitalPick : "";
  const needHospitals = step === 2 || (step === REVIEW_STEP && pickedSlug !== "");
  useEffect(() => {
    if (!needHospitals || hospIndex) return;
    let alive = true;
    loadHospitalIndex().then((ix) => alive && setHospIndex(ix));
    return () => {
      alive = false;
    };
  }, [needHospitals, hospIndex]);

  // ---- Move focus after a screen change, an error or a submit failure -----
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "heading") {
      window.scrollTo(0, 0);
      headingRef.current?.focus({ preventScroll: true });
    } else if (target === "summary") {
      window.scrollTo(0, 0);
      summaryRef.current?.focus({ preventScroll: true });
    } else if (target === "submitError") {
      submitErrorRef.current?.scrollIntoView({ block: "nearest" });
    } else {
      document.getElementById(target.id)?.focus();
    }
  });

  // ---- Derived data --------------------------------------------------------
  const procName = useMemo(() => new Map((procIndex?.p ?? []).map((r) => [r[0], r[1]])), [procIndex]);

  const procedureOptions = useMemo<ComboOption[]>(
    () =>
      (procIndex?.p ?? [])
        .map(([slug, name]) => ({
          value: slug,
          label: name,
          group: procedureGroup(slug).group,
          keywords: synonymsFor(slug),
          lang: hiData,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [procIndex, hiData]
  );

  const hospitalOptions = useMemo<ComboOption[]>(() => {
    if (!hospIndex || !form.city || form.city === OTHER) return [];
    const ci = hospIndex.l.indexOf(form.city);
    if (ci < 0) return [];
    const rows = hospIndex.h.filter((r) => r[1] === ci);
    const seen = new Map<string, number>();
    for (const [name] of rows) seen.set(name, (seen.get(name) ?? 0) + 1);
    return rows
      .map(([name, , slug, pin]) => ({
        value: slug,
        // Same name twice in a city (chains, repeated rows): the PIN tells them apart.
        label: (seen.get(name) ?? 0) > 1 && pin ? `${name} · ${pin}` : name,
        keywords: pin ? [pin] : undefined,
        lang: hiData,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [hospIndex, form.city, hiData]);

  const hospitalName = useMemo(() => {
    if (!hospIndex || !pickedSlug) return null;
    const ci = hospIndex.l.indexOf(form.city);
    return hospIndex.h.find((r) => r[2] === pickedSlug && r[1] === ci)?.[0] ?? null;
  }, [hospIndex, pickedSlug, form.city]);

  const derivedCategory: Category | "" =
    form.procedure && form.procedure !== OTHER ? procedureGroup(form.procedure).shareCategory : "";
  const showCategoryList =
    form.procedure === OTHER || kindEditing || (form.procedure !== "" && form.category !== derivedCategory);

  const final = money(form.final);
  const componentSum = COMPONENTS.reduce((s, c) => s + (money(form.components[c] ?? "") ?? 0), 0);
  const breakdownEmpty =
    COMPONENTS.every((c) => !form.components[c]) && form.surprises.every((s) => !s.item.trim() && !s.amount);

  // ---- Validation: one list of problems per question screen ---------------
  const problems: Problem[][] = (() => {
    const p1: Problem[] = [];
    if (!form.procedure) p1.push({ fieldId: "procedure", message: t("share.err.procedure") });
    if (form.procedure === OTHER && form.procedureOther.trim().length < 3)
      p1.push({ fieldId: "procedureOther", message: t("share.err.procedureOther") });
    if (form.procedure && !form.category) p1.push({ fieldId: "category", message: t("share.err.category") });

    const p2: Problem[] = [];
    if (!form.city) p2.push({ fieldId: "city", message: t("share.err.city") });
    if (form.city === OTHER && form.cityOther.trim().length < 2)
      p2.push({ fieldId: "cityOther", message: t("share.err.cityOther") });
    if (!form.hospitalType) p2.push({ fieldId: "hospitalType", message: t("share.err.hospitalType") });

    const p3: Problem[] = [];
    if (!form.month || !form.year) p3.push({ fieldId: form.month ? "year" : "month", message: t("share.err.month") });
    else if (new Date(Number(form.year), Number(form.month) - 1, 1) > today)
      p3.push({ fieldId: "month", message: t("share.err.monthFuture") });
    if (!form.admitted) p3.push({ fieldId: "admitted", message: t("share.err.admitted") });
    if (form.admitted === "yes") {
      const days = int(form.stayDays);
      if (days === null || days < 1) p3.push({ fieldId: "stayDays", message: t("share.err.stayDays") });
      if (form.icuDays !== "" && int(form.icuDays) === null)
        p3.push({ fieldId: "icuDays", message: t("share.err.icuDays") });
      if (!form.roomType) p3.push({ fieldId: "roomType", message: t("share.err.roomType") });
    }

    const p4: Problem[] = [];
    if (!form.payment) p4.push({ fieldId: "payment", message: t("share.err.payment") });
    if (final === null) p4.push({ fieldId: "final", message: t("share.err.final") });
    const covered = money(form.covered);
    if (form.payment && form.payment !== "self" && final !== null && covered !== null && covered > final)
      p4.push({ fieldId: "covered", message: t("share.err.covered") });

    const p5: Problem[] = [];
    if (final !== null && componentSum > final)
      p5.push({ fieldId: "component-room", message: t("share.err.components") });
    const incomplete = form.surprises.find((s) => (s.item.trim().length < 2) !== (money(s.amount) === null));
    if (incomplete)
      p5.push({
        fieldId: incomplete.item.trim().length < 2 ? `surprise-${incomplete.key}-item` : `surprise-${incomplete.key}-amount`,
        message: t("share.err.surpriseIncomplete"),
      });
    const tooBig = final !== null ? form.surprises.find((s) => (money(s.amount) ?? 0) > final) : undefined;
    if (tooBig) p5.push({ fieldId: `surprise-${tooBig.key}-amount`, message: t("share.err.surpriseTooBig") });

    const p6: Problem[] = [];
    if (!form.consent) p6.push({ fieldId: "consent", message: t("share.err.consent") });

    return [p1, p2, p3, p4, p5, p6];
  })();

  const stepProblems = step >= 1 ? problems[step - 1] : [];
  const visibleProblems = showErrors ? stepProblems : [];
  const errorFor = (fieldId: string) => visibleProblems.find((p) => p.fieldId === fieldId)?.message;

  // ---- Navigation -----------------------------------------------------------
  function goTo(n: number) {
    window.history.pushState({ shareStep: n }, "", `#step-${n}`);
    setShowErrors(false);
    setKindEditing(false);
    pendingFocus.current = "heading";
    setStep(n);
  }

  function showProblems() {
    setShowErrors(true);
    pendingFocus.current = "summary";
    setFocusTick((x) => x + 1);
  }

  function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (stepProblems.length > 0) {
      showProblems();
      return;
    }
    const next = returnToReview.current ? REVIEW_STEP : step + 1;
    returnToReview.current = false;
    goTo(next);
  }

  function changeFromReview(target: number) {
    returnToReview.current = true;
    goTo(target);
  }

  function back() {
    window.history.back();
  }

  function skipBreakdown() {
    returnToReview.current = false;
    goTo(REVIEW_STEP);
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!BILL_SHARING_ENABLED || submit.kind === "sending") return;
    const firstBad = problems.findIndex((p) => p.length > 0);
    if (firstBad >= 0) {
      const target = firstBad + 1;
      if (target !== step) {
        returnToReview.current = true;
        window.history.pushState({ shareStep: target }, "", `#step-${target}`);
        setKindEditing(false);
        setStep(target);
      }
      showProblems();
      return;
    }

    const admitted = form.admitted === "yes";
    const hospitalSlug = pickedSlug || null;
    const typedHospital = form.city === OTHER || form.hospitalPick === OTHER ? form.hospitalOther.trim() : "";
    const report: BillReport = {
      browser_id: getBrowserId(),
      city: form.city === OTHER ? form.cityOther.trim() : form.city,
      category: form.category as Category,
      procedure_slug: form.procedure !== OTHER ? form.procedure : null,
      procedure_other: form.procedure === OTHER ? form.procedureOther.trim() : null,
      hospital_slug: hospitalSlug,
      hospital_other: hospitalSlug ? null : typedHospital || null,
      hospital_type: form.hospitalType as HospitalType,
      treated_month: `${form.year}-${form.month}-01`,
      admitted,
      stay_days: admitted ? int(form.stayDays) : null,
      icu_days: admitted ? int(form.icuDays) : null,
      room_type: admitted ? (form.roomType as RoomType) : null,
      complications: form.complications || null,
      payment: form.payment as Payment,
      quoted_amount: money(form.quoted),
      final_amount: final!,
      covered_amount: form.payment !== "self" ? money(form.covered) : null,
      components: Object.fromEntries(
        COMPONENTS.map((c) => [c, money(form.components[c] ?? "")]).filter(([, v]) => v !== null)
      ),
      surprises: form.surprises
        .filter((s) => s.item.trim() && money(s.amount))
        .map((s) => ({ item: s.item.trim(), amount: money(s.amount)! })),
    };

    setSubmit({ kind: "sending" });
    try {
      const id = await submitBill(report);
      clearDraft();
      doneRef.current = true;
      setForm(EMPTY);
      setShowErrors(false);
      pendingFocus.current = "heading";
      setSubmit({ kind: "done", id });
      window.history.replaceState({ shareStep: 0 }, "", pathOnly());
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      pendingFocus.current = "submitError";
      setSubmit({ kind: "error", code: code === "rate_limited" || code === "busy" ? code : "generic" });
    }
  }

  // ---- Field handlers -------------------------------------------------------
  function pickProcedure(v: string | null) {
    setKindEditing(false);
    if (v === null) setForm((f) => ({ ...f, procedure: "", category: "" }));
    else if (v === OTHER) setForm((f) => ({ ...f, procedure: OTHER, category: "" }));
    else setForm((f) => ({ ...f, procedure: v, procedureOther: "", category: procedureGroup(v).shareCategory }));
  }

  function editKind() {
    setKindEditing(true);
    // ChoiceList ids: the first input is "category", the rest "category-<i>".
    const i = form.category ? CATEGORIES.indexOf(form.category) : 0;
    pendingFocus.current = { id: i > 0 ? `category-${i}` : "category" };
  }

  function addSurprise() {
    const key = newKey();
    setForm((f) => ({ ...f, surprises: [...f.surprises, { key, item: "", amount: "" }] }));
    pendingFocus.current = { id: `surprise-${key}-item` };
  }

  function removeSurprise(key: string) {
    setForm((f) => ({ ...f, surprises: f.surprises.filter((s) => s.key !== key) }));
    pendingFocus.current = { id: "add-surprise" };
  }

  function updateSurprise(key: string, patch: Partial<Surprise>) {
    setForm((f) => ({ ...f, surprises: f.surprises.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  }

  // ---- Done -------------------------------------------------------------------
  if (submit.kind === "done") {
    return (
      <PageShell>
        <Icon name="check-circle" className="size-12 text-success-icon" />
        <div className="mt-4">
          <ScreenTitle ref={headingRef}>{t("share.done.title")}</ScreenTitle>
        </div>
        <p className="mt-3 max-w-[65ch] text-body text-label">{t("share.done.body", { n: UNLOCK_BILLS })}</p>
        <Card className="mt-8">
          <p className="text-footnote font-semibold text-label-2">{t("share.done.receipt")}</p>
          <p className="mt-1 break-all text-title3 tabular-nums text-label select-all">{submit.id}</p>
        </Card>
        <div className="mt-8">
          <ShareButton text={t("share.done.shareText")} path="/share-bill" />
        </div>
        <div className="mt-6 flex flex-col items-start">
          <ActionLink href="/check-bill">{t("share.done.checkMedicines")}</ActionLink>
          <ActionLink href="/">{t("share.done.home")}</ActionLink>
        </div>
      </PageShell>
    );
  }

  // ---- Intro (step 0) ------------------------------------------------------
  if (step === 0) {
    return (
      <PageShell>
        <div className={BILL_SHARING_ENABLED ? "pb-28 md:pb-0" : undefined}>
          <div className="mb-8 md:mb-10">
            <ScreenTitle ref={headingRef}>{t("share.title")}</ScreenTitle>
            <p className="mt-3 max-w-[60ch] text-lead text-label-2">{t("share.subtitle")}</p>
          </div>

          <InsetGroup>
            <ListRow leading="lock" title={t("share.promiseNoLogin")} />
            <ListRow leading="users" title={t("share.promiseNoName")} />
            <ListRow leading="hospital" title={t("share.promiseHospital")} />
          </InsetGroup>
          <p className="mt-3 px-4 text-footnote text-label-2">{t("share.duration")}</p>

          {BILL_SHARING_ENABLED ? (
            <StickyActionBar>
              <Button block onClick={() => goTo(1)}>
                {t("share.start")}
              </Button>
            </StickyActionBar>
          ) : (
            <div className="mt-8 space-y-4">
              <Callout tone="warn">{t("share.notOpen")}</Callout>
              <Button block disabled>
                {t("share.closedButton")}
              </Button>
            </div>
          )}

          <section aria-labelledby="share-stats" className="mt-12 md:mt-16">
            <SectionHeader id="share-stats" title={t("share.stats.heading")} />
            <PatientReported>
              <p className="text-callout text-label-2">
                {t("share.stats.rule", { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS })}
              </p>
              {stats.kind === "loading" && <Skeleton className="h-24" />}
              {stats.kind === "none" && <p>{t("share.stats.none")}</p>}
              {stats.kind === "ready" && (
                <>
                  <StatTile label={t("share.stats.approved")} value={stats.data.approved.toLocaleString("en-IN")} />
                  {stats.data.unlocked.length > 0 ? (
                    <ul className="space-y-4">
                      {stats.data.unlocked.map((g) => (
                        <li key={`${g.city}-${g.procedure}`}>
                          <p className="text-body text-label">
                            <DataText>
                              {procName.get(g.procedure) ?? g.procedure} · {g.city}
                            </DataText>
                          </p>
                          <p className="mt-1 text-title3 tabular-nums text-label">
                            <Money value={Math.round(g.median)} />
                          </p>
                          <p className="mt-1 text-callout text-label-2">
                            {t("share.stats.middleHalf")}{" "}
                            <MoneyRange low={Math.round(g.p25)} high={Math.round(g.p75)} />
                            {" · "}
                            {t("share.stats.bills", { n: g.n })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t("share.stats.none")}</p>
                  )}
                  {stats.data.progress.length > 0 && (
                    <ul className="space-y-1 text-callout text-label-2">
                      {stats.data.progress.slice(0, 6).map((g) => (
                        <li key={`${g.city}-${g.procedure}`}>
                          {t("share.stats.progress", {
                            proc: procName.get(g.procedure) ?? g.procedure,
                            city: g.city,
                            n: g.n,
                            total: UNLOCK_BILLS,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                  {stats.data.unlocked.length > 0 && (
                    <p className="text-footnote text-label-2">{t("share.stats.unverified")}</p>
                  )}
                </>
              )}
            </PatientReported>
          </section>

          <PageNotes anchor="patient-bills" />
        </div>
      </PageShell>
    );
  }

  // ---- Question screens and "Check your answers" ------------------------------
  const isReview = step === REVIEW_STEP;
  const notGiven = t("share.review.notGiven");

  const reviewRows: { label: string; value: React.ReactNode; sub?: string; target: number }[] = isReview
    ? [
        {
          label: t("share.review.procedure"),
          value:
            form.procedure === OTHER ? (
              <DataText>{form.procedureOther}</DataText>
            ) : procIndex ? (
              <DataText>{procName.get(form.procedure) ?? form.procedure}</DataText>
            ) : (
              <Skeleton className="h-6 w-40" />
            ),
          sub: form.category ? t("share.kindPrefilled", { kind: t(`share.category.${form.category}`) }) : undefined,
          target: 1,
        },
        {
          label: t("share.review.where"),
          value: <DataText>{form.city === OTHER ? form.cityOther : form.city}</DataText>,
          target: 2,
        },
        {
          label: t("share.review.hospital"),
          value: pickedSlug ? (
            hospIndex ? (
              <DataText>{hospitalName ?? pickedSlug}</DataText>
            ) : (
              <Skeleton className="h-6 w-40" />
            )
          ) : (form.city === OTHER || form.hospitalPick === OTHER) && form.hospitalOther.trim() ? (
            <DataText>{form.hospitalOther}</DataText>
          ) : (
            notGiven
          ),
          target: 2,
        },
        {
          label: t("share.review.when"),
          value: form.month && form.year ? `${t(`share.months.${Number(form.month) - 1}`)} ${form.year}` : notGiven,
          target: 3,
        },
        {
          label: t("share.review.stay"),
          value:
            form.admitted === "yes"
              ? t("share.review.stayValue", { days: form.stayDays, icu: form.icuDays || "0" })
              : t("share.review.dayCare"),
          target: 3,
        },
        {
          label: t("share.review.payment"),
          value: form.payment ? t(`share.payment.${form.payment}`) : notGiven,
          target: 4,
        },
        {
          label: t("share.review.quoted"),
          value: money(form.quoted) !== null ? <Money value={money(form.quoted)} /> : notGiven,
          target: 4,
        },
        { label: t("share.review.final"), value: <Money value={final} />, target: 4 },
      ]
    : [];

  return (
    <PageShell>
      <form noValidate onSubmit={isReview ? onSend : onContinue} className="pb-28 md:pb-0">
        <StepHeader step={step} total={TOTAL_STEPS} onBack={back} />

        <div className="mt-6 space-y-6">
          <ErrorSummary errors={visibleProblems} titleRef={summaryRef} />
          <ScreenTitle ref={headingRef}>{t(STEP_TITLE[step])}</ScreenTitle>

          {/* 1. Which treatment */}
          {step === 1 && (
            <>
              {procIndex ? (
                <Combobox
                  id="procedure"
                  label={t("share.q.procedure")}
                  hint={t("share.q.procedureHint")}
                  placeholder={t("share.q.procedurePlaceholder")}
                  options={procedureOptions}
                  groupOrder={GROUP_ORDER}
                  groupLabel={(g) => t(`procedures.group.${g}`)}
                  value={form.procedure || null}
                  onChange={pickProcedure}
                  footerOption={{ value: OTHER, label: t("share.q.procedureOther") }}
                  error={errorFor("procedure")}
                />
              ) : (
                <FieldLoading label={t("share.q.procedure")} />
              )}

              {form.procedure === OTHER && (
                <TextField
                  id="procedureOther"
                  label={t("share.q.procedureOtherLabel")}
                  hint={t("share.q.procedureOtherPlaceholder")}
                  value={form.procedureOther}
                  onChange={(e) => set("procedureOther", e.target.value.slice(0, 120))}
                  autoComplete="off"
                  error={errorFor("procedureOther")}
                />
              )}

              {form.procedure && form.procedure !== OTHER && !showCategoryList && form.category && (
                <p className="flex flex-wrap items-center gap-x-3 text-callout text-label-2">
                  <span>{t("share.kindPrefilled", { kind: t(`share.category.${form.category}`) })}</span>
                  <Button variant="plain" onClick={editKind}>
                    {t("common.change")}
                    <span className="sr-only"> {t("share.q.category")}</span>
                  </Button>
                </p>
              )}

              {form.procedure && showCategoryList && (
                <ChoiceList
                  name="category"
                  legend={t("share.q.category")}
                  type="radio"
                  options={CATEGORIES.map((c) => ({ value: c, label: t(`share.category.${c}`) }))}
                  value={form.category}
                  onChange={(v) => set("category", v as Category)}
                  error={errorFor("category")}
                />
              )}
            </>
          )}

          {/* 2. Where */}
          {step === 2 && (
            <>
              <ChoiceList
                name="city"
                legend={t("share.q.city")}
                type="radio"
                options={[
                  ...cities.map((c) => ({ value: c, label: c })),
                  {
                    value: OTHER,
                    label: t("share.q.cityOther"),
                    reveal: (
                      <TextField
                        id="cityOther"
                        label={t("share.q.cityOtherPlaceholder")}
                        value={form.cityOther}
                        onChange={(e) => set("cityOther", e.target.value.slice(0, 60))}
                        autoComplete="address-level2"
                        error={errorFor("cityOther")}
                      />
                    ),
                  },
                ]}
                value={form.city}
                onChange={(v) => setForm((f) => ({ ...f, city: v as string, hospitalPick: "", hospitalOther: "" }))}
                error={errorFor("city")}
              />

              {form.city === OTHER && (
                <TextField
                  id="hospitalOther"
                  label={t("share.q.hospital")}
                  hint={t("share.q.hospitalHint")}
                  placeholder={t("share.q.hospitalFreeText")}
                  value={form.hospitalOther}
                  onChange={(e) => set("hospitalOther", e.target.value.slice(0, 120))}
                  autoComplete="off"
                />
              )}

              {form.city && form.city !== OTHER && (
                <>
                  {hospIndex ? (
                    <Combobox
                      id="hospital"
                      label={t("share.q.hospital")}
                      hint={t("share.q.hospitalHint")}
                      placeholder={t("share.q.hospitalSearch")}
                      options={hospitalOptions}
                      value={form.hospitalPick || null}
                      onChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          hospitalPick: v ?? "",
                          hospitalOther: v === OTHER ? f.hospitalOther : "",
                        }))
                      }
                      footerOption={{ value: OTHER, label: t("share.q.hospitalOther") }}
                    />
                  ) : (
                    <FieldLoading label={t("share.q.hospital")} />
                  )}
                  {form.hospitalPick === OTHER && (
                    <TextField
                      id="hospitalOther"
                      label={t("share.q.hospitalFreeText")}
                      value={form.hospitalOther}
                      onChange={(e) => set("hospitalOther", e.target.value.slice(0, 120))}
                      autoComplete="off"
                    />
                  )}
                </>
              )}

              <ChoiceList
                name="hospitalType"
                legend={t("share.q.hospitalType")}
                type="radio"
                options={HOSPITAL_TYPES.map((h) => ({ value: h, label: t(`share.hospitalType.${h}`) }))}
                value={form.hospitalType}
                onChange={(v) => set("hospitalType", v as HospitalType)}
                error={errorFor("hospitalType")}
              />
            </>
          )}

          {/* 3. The stay */}
          {step === 3 && (
            <>
              <FieldGroup id="when" legend={t("share.q.month")}>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    id="month"
                    label={t("share.q.monthPlaceholder")}
                    value={form.month}
                    onChange={(e) => set("month", e.target.value)}
                    error={errorFor("month")}
                  >
                    <option value="">{t("share.q.monthPlaceholder")}</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i} value={String(i + 1).padStart(2, "0")}>
                        {t(`share.months.${i}`)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    id="year"
                    label={t("share.q.yearPlaceholder")}
                    value={form.year}
                    onChange={(e) => set("year", e.target.value)}
                    error={errorFor("year")}
                  >
                    <option value="">{t("share.q.yearPlaceholder")}</option>
                    {Array.from({ length: 5 }, (_, i) => String(today.getFullYear() - i)).map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
              </FieldGroup>

              <ChoiceList
                name="admitted"
                legend={t("share.q.admitted")}
                hint={t("share.q.admittedHint")}
                type="radio"
                options={[
                  {
                    value: "yes",
                    label: t("share.yes"),
                    reveal: (
                      <>
                        <TextField
                          id="stayDays"
                          label={t("share.q.stayDays")}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          value={form.stayDays}
                          onChange={(e) => set("stayDays", digits(e.target.value, 3))}
                          className="max-w-40 tabular-nums"
                          error={errorFor("stayDays")}
                        />
                        <TextField
                          id="icuDays"
                          label={t("share.q.icuDays")}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          value={form.icuDays}
                          onChange={(e) => set("icuDays", digits(e.target.value, 3))}
                          className="max-w-40 tabular-nums"
                          error={errorFor("icuDays")}
                        />
                        <ChoiceList
                          name="roomType"
                          legend={t("share.q.roomType")}
                          type="radio"
                          options={ROOM_TYPES.map((r) => ({ value: r, label: t(`share.roomType.${r}`) }))}
                          value={form.roomType}
                          onChange={(v) => set("roomType", v as RoomType)}
                          error={errorFor("roomType")}
                        />
                      </>
                    ),
                  },
                  { value: "no", label: t("share.no") },
                ]}
                value={form.admitted}
                onChange={(v) => set("admitted", v as Form["admitted"])}
                error={errorFor("admitted")}
              />

              <ChoiceList
                name="complications"
                legend={t("share.q.complications")}
                hint={t("share.q.complicationsHint")}
                type="radio"
                options={COMPLICATIONS.map((c) => ({ value: c, label: t(`share.complications.${c}`) }))}
                value={form.complications}
                onChange={(v) => set("complications", v as Form["complications"])}
              />
            </>
          )}

          {/* 4. The money */}
          {step === 4 && (
            <>
              <ChoiceList
                name="payment"
                legend={t("share.q.payment")}
                type="radio"
                options={PAYMENTS.map((p) => ({ value: p, label: t(`share.payment.${p}`) }))}
                value={form.payment}
                onChange={(v) => set("payment", v as Payment)}
                error={errorFor("payment")}
              />
              <MoneyField
                id="quoted"
                label={t("share.q.quoted")}
                hint={t("share.q.quotedHint")}
                maxLength={8}
                value={form.quoted}
                onValueChange={(v) => set("quoted", v)}
              />
              <MoneyField
                id="final"
                label={t("share.q.final")}
                hint={t("share.q.finalHint")}
                maxLength={8}
                value={form.final}
                onValueChange={(v) => set("final", v)}
                error={errorFor("final")}
              />
              {form.payment && form.payment !== "self" && (
                <MoneyField
                  id="covered"
                  label={t("share.q.covered")}
                  hint={t("share.q.coveredHint")}
                  maxLength={8}
                  value={form.covered}
                  onValueChange={(v) => set("covered", v)}
                  error={errorFor("covered")}
                />
              )}
            </>
          )}

          {/* 5. The breakdown (optional) */}
          {step === 5 && (
            <>
              {breakdownEmpty && (
                <Button variant="plain" onClick={skipBreakdown}>
                  {t("share.skip")}
                </Button>
              )}

              <FieldGroup id="components" legend={t("share.q.components")} hint={t("share.q.componentsHint")}>
                <div className="grid gap-6 md:grid-cols-2">
                  {COMPONENTS.map((c) => (
                    <MoneyField
                      key={c}
                      id={`component-${c}`}
                      label={t(`share.component.${c}`)}
                      maxLength={8}
                      value={form.components[c] ?? ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, components: { ...f.components, [c]: v } }))}
                      error={c === "room" ? errorFor("component-room") : undefined}
                    />
                  ))}
                </div>
                {final !== null && componentSum > 0 && (
                  <p className="text-callout tabular-nums text-label-2">
                    {t("share.q.componentsSum", { sum: formatINR(componentSum), total: formatINR(final) })}
                  </p>
                )}
              </FieldGroup>

              <FieldGroup id="surprises" legend={t("share.q.surprises")} hint={t("share.q.surprisesHint")}>
                {form.surprises.map((s, i) => (
                  <div key={s.key} className="space-y-4 rounded-card bg-surface p-4">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <TextField
                          id={`surprise-${s.key}-item`}
                          label={t("share.q.surpriseItem")}
                          value={s.item}
                          onChange={(e) => updateSurprise(s.key, { item: e.target.value.slice(0, 80) })}
                          autoComplete="off"
                          error={errorFor(`surprise-${s.key}-item`)}
                        />
                      </div>
                      <IconButton
                        icon="trash"
                        label={t("share.removeCharge", { n: i + 1 })}
                        onClick={() => removeSurprise(s.key)}
                      />
                    </div>
                    <MoneyField
                      id={`surprise-${s.key}-amount`}
                      label={t("share.q.surpriseAmount")}
                      maxLength={8}
                      value={s.amount}
                      onValueChange={(v) => updateSurprise(s.key, { amount: v })}
                      error={errorFor(`surprise-${s.key}-amount`)}
                    />
                  </div>
                ))}
                {form.surprises.length < MAX_SURPRISES && (
                  <div>
                    <Button id="add-surprise" variant="tonal" icon="plus" onClick={addSurprise}>
                      {t("share.q.addSurprise")}
                    </Button>
                  </div>
                )}
              </FieldGroup>
            </>
          )}

          {/* 6. Check your answers */}
          {isReview && (
            <>
              <InsetGroup>
                {reviewRows.map((r) => (
                  <ListRow
                    key={r.label}
                    title={
                      <>
                        <span className="block text-callout text-label-2">{r.label}</span>
                        <span className="block">{r.value}</span>
                      </>
                    }
                    subtitle={r.sub}
                    trailing={
                      <Button variant="plain" onClick={() => changeFromReview(r.target)}>
                        {t("common.change")}
                        <span className="sr-only"> {r.label}</span>
                      </Button>
                    }
                  />
                ))}
              </InsetGroup>

              <ChoiceList
                name="consent"
                legend={<span className="sr-only">{t("share.submit")}</span>}
                type="checkbox"
                options={[{ value: "yes", label: t("share.consent", { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS }) }]}
                value={form.consent ? ["yes"] : []}
                onChange={(v) => set("consent", Array.isArray(v) && v.includes("yes"))}
                error={errorFor("consent")}
              />

              {submit.kind === "error" && (
                <div ref={submitErrorRef} role="alert">
                  <Callout icon="alert">{t(`share.submitError.${submit.code}`)}</Callout>
                </div>
              )}
            </>
          )}
        </div>

        <StickyActionBar>
          {isReview ? (
            <Button type="submit" block disabled={!BILL_SHARING_ENABLED || submit.kind === "sending"}>
              {submit.kind === "sending" ? t("share.sending") : t("share.submit")}
            </Button>
          ) : (
            <Button type="submit" block>
              {t("share.continue")}
            </Button>
          )}
        </StickyActionBar>
      </form>
    </PageShell>
  );
}
