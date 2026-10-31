"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import ShareButton from "@/components/ShareButton";

// A short wizard modelled on whatthebill.in's "Spill your bill": no login, no
// upload, every money field typed by the person. The hospital is asked for
// but never shown publicly (see the migration's header); only city +
// procedure aggregates of approved bills come back, via bill_stats().

export type ProcedureOption = { slug: string; name: string };
export type HospitalOption = { slug: string; name: string; city: string };

const OTHER = "__other__";
const HOSPITAL_TYPES: HospitalType[] = ["private", "government", "trust", "unknown"];
const ROOM_TYPES: RoomType[] = ["general", "semi_private", "private", "none"];
const MAX_SURPRISES = 10;
const STEPS = ["what", "stay", "money", "breakdown", "review"] as const;

type Form = {
  category: Category | "";
  procedure: string; // slug, OTHER, or ""
  procedureOther: string;
  city: string; // directory city, OTHER, or ""
  cityOther: string;
  hospitalSlug: string;
  hospitalOther: string;
  hospitalType: HospitalType | "";
  month: string; // "01".."12"
  year: string;
  admitted: "yes" | "no" | "";
  stayDays: string;
  icuDays: string;
  roomType: RoomType | "";
  complications: "no" | "yes" | "unsure" | "";
  payment: Payment | "";
  quoted: string;
  final: string;
  covered: string;
  components: Partial<Record<Component, string>>;
  surprises: { item: string; amount: string }[];
  consent: boolean;
};

const EMPTY: Form = {
  category: "",
  procedure: "",
  procedureOther: "",
  city: "",
  cityOther: "",
  hospitalSlug: "",
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

const money = (s: string): number | null => {
  const n = Number(s.replace(/,/g, ""));
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const int = (s: string): number | null => {
  const n = Number(s);
  return s.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : null;
};

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? "border-brand-600 bg-brand-50 font-semibold text-brand-800" : "border-ink-300 text-ink-700 hover:border-brand-500"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-ink-900">{label}</div>
      {hint && <div className="text-xs text-ink-500">{hint}</div>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-ink-300 bg-surface px-3 py-2.5 text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function MoneyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center rounded-lg border border-ink-300 bg-surface focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <span className="pl-3 text-ink-500">₹</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,]/g, ""))}
        placeholder={placeholder}
        className="w-full bg-transparent px-2 py-2.5 text-ink-900 outline-none"
      />
    </div>
  );
}

export default function ShareBillView({
  procedures,
  hospitals,
}: {
  procedures: ProcedureOption[];
  hospitals: HospitalOption[];
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submit, setSubmit] = useState<{ kind: "idle" | "sending" } | { kind: "done"; id: string } | { kind: "error"; code: string }>({
    kind: "idle",
  });
  const [stats, setStats] = useState<BillStats | null>(null);

  useEffect(() => {
    if (!BILL_SHARING_ENABLED) return;
    getBillStats().then(setStats).catch(() => setStats(null));
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const cities = useMemo(() => Array.from(new Set(hospitals.map((h) => h.city))).sort(), [hospitals]);
  const procName = useMemo(() => new Map(procedures.map((p) => [p.slug, p.name])), [procedures]);

  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));
  const final = money(form.final);
  const componentSum = COMPONENTS.reduce((s, c) => s + (money(form.components[c] ?? "") ?? 0), 0);

  // One list of problems per step; a step can't be left with any.
  const problems: string[][] = [
    [
      !form.category && t("share.err.category"),
      !form.procedure && t("share.err.procedure"),
      form.procedure === OTHER && form.procedureOther.trim().length < 3 && t("share.err.procedureOther"),
      !form.city && t("share.err.city"),
      form.city === OTHER && form.cityOther.trim().length < 2 && t("share.err.cityOther"),
      !form.hospitalType && t("share.err.hospitalType"),
    ].filter(Boolean) as string[],
    [
      (!form.month || !form.year) && t("share.err.month"),
      form.month && form.year && new Date(Number(form.year), Number(form.month) - 1, 1) > now && t("share.err.monthFuture"),
      !form.admitted && t("share.err.admitted"),
      form.admitted === "yes" && !(int(form.stayDays) && int(form.stayDays)! >= 1) && t("share.err.stayDays"),
      form.admitted === "yes" && !form.roomType && t("share.err.roomType"),
      form.icuDays !== "" && int(form.icuDays) === null && t("share.err.icuDays"),
    ].filter(Boolean) as string[],
    [
      !form.payment && t("share.err.payment"),
      !final && t("share.err.final"),
      final !== null && money(form.covered) !== null && money(form.covered)! > final && t("share.err.covered"),
    ].filter(Boolean) as string[],
    [
      final !== null && componentSum > final && t("share.err.components"),
      form.surprises.some((s) => (s.item.trim().length < 2) !== (money(s.amount) === null)) && t("share.err.surpriseIncomplete"),
      final !== null && form.surprises.some((s) => (money(s.amount) ?? 0) > final) && t("share.err.surpriseTooBig"),
    ].filter(Boolean) as string[],
    [!form.consent && t("share.err.consent")].filter(Boolean) as string[],
  ];

  function next() {
    if (problems[step].length > 0) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function send() {
    if (problems.some((p) => p.length > 0)) {
      setShowErrors(true);
      return;
    }
    const admitted = form.admitted === "yes";
    const report: BillReport = {
      browser_id: getBrowserId(),
      city: form.city === OTHER ? form.cityOther.trim() : form.city,
      category: form.category as Category,
      procedure_slug: form.procedure !== OTHER ? form.procedure : null,
      procedure_other: form.procedure === OTHER ? form.procedureOther.trim() : null,
      hospital_slug: form.hospitalSlug || null,
      hospital_other: form.hospitalSlug ? null : form.hospitalOther.trim() || null,
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
      setSubmit({ kind: "done", id });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setSubmit({ kind: "error", code: ["rate_limited", "busy"].includes(code) ? code : "generic" });
    }
  }

  if (submit.kind === "done") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700">✓</div>
        <h1 className="mt-5 text-3xl font-bold text-ink-900">{t("share.done.title")}</h1>
        <p className="mt-3 text-ink-700">{t("share.done.body", { n: UNLOCK_BILLS })}</p>
        <p className="mt-6 text-xs text-ink-500">{t("share.done.receipt")}</p>
        <p className="mt-1 font-mono text-sm text-ink-900">{submit.id}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ShareButton text={t("share.done.shareText")} path="/share-bill" />
          <Link href="/check-bill" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            {t("share.done.checkMedicines")}
          </Link>
        </div>
      </div>
    );
  }

  const errs = showErrors ? problems[step] : [];
  const hospitalChoices =
    form.city && form.city !== OTHER ? hospitals.filter((h) => h.city === form.city) : [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t("share.eyebrow")}</div>
      <h1 className="mt-2 text-3xl font-bold text-ink-900">{t("share.title")}</h1>
      <p className="mt-3 text-ink-700">{t("share.subtitle")}</p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-medium text-brand-700">
        <span>✓ {t("share.promiseNoLogin")}</span>
        <span>✓ {t("share.promiseNoName")}</span>
        <span>✓ {t("share.promiseHospital")}</span>
      </div>

      {!BILL_SHARING_ENABLED && (
        <p className="mt-6 rounded-xl border border-warn-200 bg-warn-50 p-4 text-sm text-warn-900">{t("share.notOpen")}</p>
      )}

      {/* progress */}
      <ol className="mt-8 flex gap-1.5" aria-label={t("share.progressLabel")}>
        {STEPS.map((s, i) => (
          <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-500" : "bg-ink-100"}`} />
        ))}
      </ol>
      <div className="mt-2 text-xs text-ink-500">
        {t("share.stepOf", { n: step + 1, total: STEPS.length })} · {t(`share.steps.${STEPS[step]}`)}
      </div>

      <div className="mt-6 space-y-7 rounded-2xl border border-ink-100 bg-surface p-5 sm:p-6">
        {step === 0 && (
          <>
            <Field label={t("share.q.category")}>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <Pill key={c} active={form.category === c} onClick={() => set("category", c)}>
                    {t(`share.category.${c}`)}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label={t("share.q.procedure")} hint={t("share.q.procedureHint")}>
              <select value={form.procedure} onChange={(e) => set("procedure", e.target.value)} className={inputCls}>
                <option value="">{t("share.q.procedurePlaceholder")}</option>
                {procedures.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
                <option value={OTHER}>{t("share.q.procedureOther")}</option>
              </select>
              {form.procedure === OTHER && (
                <input
                  value={form.procedureOther}
                  onChange={(e) => set("procedureOther", e.target.value.slice(0, 120))}
                  placeholder={t("share.q.procedureOtherPlaceholder")}
                  className={`${inputCls} mt-2`}
                />
              )}
            </Field>

            <Field label={t("share.q.city")}>
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <Pill
                    key={c}
                    active={form.city === c}
                    onClick={() => setForm((f) => ({ ...f, city: c, hospitalSlug: "", hospitalOther: "" }))}
                  >
                    {c}
                  </Pill>
                ))}
                <Pill
                  active={form.city === OTHER}
                  onClick={() => setForm((f) => ({ ...f, city: OTHER, hospitalSlug: "" }))}
                >
                  {t("share.q.cityOther")}
                </Pill>
              </div>
              {form.city === OTHER && (
                <input
                  value={form.cityOther}
                  onChange={(e) => set("cityOther", e.target.value.slice(0, 60))}
                  placeholder={t("share.q.cityOtherPlaceholder")}
                  className={`${inputCls} mt-2`}
                />
              )}
            </Field>

            {form.city && (
              <Field label={t("share.q.hospital")} hint={t("share.q.hospitalHint")}>
                <HospitalPicker
                  choices={hospitalChoices}
                  selectedSlug={form.hospitalSlug}
                  typed={form.hospitalOther}
                  onSelect={(slug) => setForm((f) => ({ ...f, hospitalSlug: slug, hospitalOther: "" }))}
                  onType={(text) => setForm((f) => ({ ...f, hospitalSlug: "", hospitalOther: text }))}
                />
              </Field>
            )}

            <Field label={t("share.q.hospitalType")}>
              <div className="flex flex-wrap gap-2">
                {HOSPITAL_TYPES.map((h) => (
                  <Pill key={h} active={form.hospitalType === h} onClick={() => set("hospitalType", h)}>
                    {t(`share.hospitalType.${h}`)}
                  </Pill>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t("share.q.month")}>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.month} onChange={(e) => set("month", e.target.value)} className={inputCls}>
                  <option value="">{t("share.q.monthPlaceholder")}</option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                    <option key={m} value={m}>
                      {t(`share.months.${Number(m) - 1}`)}
                    </option>
                  ))}
                </select>
                <select value={form.year} onChange={(e) => set("year", e.target.value)} className={inputCls}>
                  <option value="">{t("share.q.yearPlaceholder")}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field label={t("share.q.admitted")} hint={t("share.q.admittedHint")}>
              <div className="flex flex-wrap gap-2">
                <Pill active={form.admitted === "yes"} onClick={() => set("admitted", "yes")}>
                  {t("share.yes")}
                </Pill>
                <Pill active={form.admitted === "no"} onClick={() => set("admitted", "no")}>
                  {t("share.no")}
                </Pill>
              </div>
            </Field>

            {form.admitted === "yes" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t("share.q.stayDays")}>
                    <input
                      inputMode="numeric"
                      value={form.stayDays}
                      onChange={(e) => set("stayDays", e.target.value.replace(/\D/g, "").slice(0, 3))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("share.q.icuDays")}>
                    <input
                      inputMode="numeric"
                      value={form.icuDays}
                      onChange={(e) => set("icuDays", e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="0"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label={t("share.q.roomType")}>
                  <div className="flex flex-wrap gap-2">
                    {ROOM_TYPES.map((r) => (
                      <Pill key={r} active={form.roomType === r} onClick={() => set("roomType", r)}>
                        {t(`share.roomType.${r}`)}
                      </Pill>
                    ))}
                  </div>
                </Field>
              </>
            )}

            <Field label={t("share.q.complications")} hint={t("share.q.complicationsHint")}>
              <div className="flex flex-wrap gap-2">
                {(["no", "yes", "unsure"] as const).map((c) => (
                  <Pill key={c} active={form.complications === c} onClick={() => set("complications", c)}>
                    {t(`share.complications.${c}`)}
                  </Pill>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t("share.q.payment")}>
              <div className="flex flex-wrap gap-2">
                {PAYMENTS.map((p) => (
                  <Pill key={p} active={form.payment === p} onClick={() => set("payment", p)}>
                    {t(`share.payment.${p}`)}
                  </Pill>
                ))}
              </div>
            </Field>
            <Field label={t("share.q.quoted")} hint={t("share.q.quotedHint")}>
              <MoneyInput value={form.quoted} onChange={(v) => set("quoted", v)} placeholder={t("share.optional")} />
            </Field>
            <Field label={t("share.q.final")} hint={t("share.q.finalHint")}>
              <MoneyInput value={form.final} onChange={(v) => set("final", v)} placeholder="1,85,000" />
            </Field>
            {form.payment && form.payment !== "self" && (
              <Field label={t("share.q.covered")} hint={t("share.q.coveredHint")}>
                <MoneyInput value={form.covered} onChange={(v) => set("covered", v)} placeholder={t("share.optional")} />
              </Field>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Field label={t("share.q.components")} hint={t("share.q.componentsHint")}>
              <div className="grid gap-3 sm:grid-cols-2">
                {COMPONENTS.map((c) => (
                  <label key={c} className="block">
                    <span className="text-xs text-ink-500">{t(`share.component.${c}`)}</span>
                    <MoneyInput
                      value={form.components[c] ?? ""}
                      onChange={(v) => setForm((f) => ({ ...f, components: { ...f.components, [c]: v } }))}
                    />
                  </label>
                ))}
              </div>
              {final !== null && componentSum > 0 && (
                <p className={`mt-2 text-xs ${componentSum > final ? "text-warn-700" : "text-ink-500"}`}>
                  {t("share.q.componentsSum", { sum: formatINR(componentSum), total: formatINR(final) })}
                </p>
              )}
            </Field>

            <Field label={t("share.q.surprises")} hint={t("share.q.surprisesHint")}>
              <div className="space-y-2">
                {form.surprises.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={s.item}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          surprises: f.surprises.map((x, j) => (j === i ? { ...x, item: e.target.value.slice(0, 80) } : x)),
                        }))
                      }
                      placeholder={t("share.q.surpriseItem")}
                      className={`${inputCls} flex-1`}
                    />
                    <div className="w-36">
                      <MoneyInput
                        value={s.amount}
                        onChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            surprises: f.surprises.map((x, j) => (j === i ? { ...x, amount: v } : x)),
                          }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={t("bill.remove")}
                      onClick={() => setForm((f) => ({ ...f, surprises: f.surprises.filter((_, j) => j !== i) }))}
                      className="w-8 shrink-0 rounded-full text-ink-500 hover:bg-ink-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {form.surprises.length < MAX_SURPRISES && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, surprises: [...f.surprises, { item: "", amount: "" }] }))}
                    className="rounded-full border border-dashed border-ink-300 px-4 py-2 text-sm text-ink-700 hover:border-brand-500"
                  >
                    {t("share.q.addSurprise")}
                  </button>
                )}
              </div>
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <dl className="divide-y divide-ink-100 text-sm">
              {[
                [t("share.review.procedure"), form.procedure === OTHER ? form.procedureOther : procName.get(form.procedure) ?? ""],
                [t("share.review.where"), form.city === OTHER ? form.cityOther : form.city],
                [
                  t("share.review.hospital"),
                  (form.hospitalSlug ? hospitals.find((h) => h.slug === form.hospitalSlug && h.city === form.city)?.name : form.hospitalOther) ||
                    t("share.review.notGiven"),
                ],
                [t("share.review.when"), form.month && form.year ? `${t(`share.months.${Number(form.month) - 1}`)} ${form.year}` : ""],
                [
                  t("share.review.stay"),
                  form.admitted === "yes"
                    ? t("share.review.stayValue", { days: form.stayDays, icu: form.icuDays || "0" })
                    : t("share.review.dayCare"),
                ],
                [t("share.review.payment"), form.payment ? t(`share.payment.${form.payment}`) : ""],
                [t("share.review.quoted"), formatINR(money(form.quoted))],
                [t("share.review.final"), formatINR(final)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-4 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--brand-600)]"
              />
              <span>{t("share.consent", { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS })}</span>
            </label>
          </>
        )}

        {errs.length > 0 && (
          <ul className="rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm text-warn-900">
            {errs.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}
        {submit.kind === "error" && (
          <p className="rounded-xl border border-warn-200 bg-warn-50 p-3 text-sm text-warn-900">
            {t(`share.submitError.${submit.code}`)}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowErrors(false);
                setStep((s) => s - 1);
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              {t("share.back")}
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {step === 3 && componentSum === 0 && form.surprises.length === 0 ? t("share.skip") : t("share.next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!BILL_SHARING_ENABLED || submit.kind === "sending"}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submit.kind === "sending" ? t("share.sending") : t("share.submit")}
            </button>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-ink-900">{t("share.stats.heading")}</h2>
        <p className="mt-1 text-sm text-ink-500">{t("share.stats.rule", { n: UNLOCK_BILLS, b: UNLOCK_BROWSERS })}</p>
        {stats && (
          <>
            <p className="mt-4 text-3xl font-bold text-ink-900">
              {stats.approved.toLocaleString("en-IN")}{" "}
              <span className="text-base font-normal text-ink-500">{t("share.stats.approved")}</span>
            </p>
            {stats.unlocked.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-ink-100">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
                    <tr>
                      <th className="px-4 py-2">{t("share.stats.colProcedure")}</th>
                      <th className="px-4 py-2 text-right">{t("share.stats.colTypical")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {stats.unlocked.map((g) => (
                      <tr key={`${g.city}-${g.procedure}`}>
                        <td className="px-4 py-2 text-ink-900">
                          {procName.get(g.procedure) ?? g.procedure} · {g.city}
                          <div className="text-xs text-ink-500">{t("share.stats.bills", { n: g.n })}</div>
                        </td>
                        <td className="px-4 py-2 text-right text-ink-900">
                          {formatINR(g.median)}
                          <div className="text-xs text-ink-500">
                            {formatINR(g.p25)} – {formatINR(g.p75)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="bg-ink-50 px-4 py-2 text-xs text-ink-500">{t("share.stats.unverified")}</p>
              </div>
            )}
            {stats.progress.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-ink-700">
                {stats.progress.slice(0, 6).map((g) => (
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
          </>
        )}
        {!stats && <p className="mt-4 text-sm text-ink-500">{t("share.stats.none")}</p>}
      </section>
    </div>
  );
}

function HospitalPicker({
  choices,
  selectedSlug,
  typed,
  onSelect,
  onType,
}: {
  choices: HospitalOption[];
  selectedSlug: string;
  typed: string;
  onSelect: (slug: string) => void;
  onType: (text: string) => void;
}) {
  const { t } = useTranslation();
  const selected = choices.find((h) => h.slug === selectedSlug);
  const [query, setQuery] = useState(typed);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm">
        <span className="font-medium text-brand-900">{selected.name}</span>
        <button
          type="button"
          onClick={() => {
            onSelect("");
            setQuery("");
          }}
          className="text-xs text-ink-500 underline"
        >
          {t("bill.change")}
        </button>
      </div>
    );
  }

  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  const matches =
    words.length > 0 ? choices.filter((h) => words.every((w) => h.name.toLowerCase().includes(w))).slice(0, 6) : [];

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          const v = e.target.value.slice(0, 120);
          setQuery(v);
          onType(v); // kept as free text unless a listed hospital is picked
        }}
        placeholder={choices.length > 0 ? t("share.q.hospitalSearch") : t("share.q.hospitalFreeText")}
        className={inputCls}
      />
      {matches.length > 0 && (
        <ul className="mt-1 overflow-hidden rounded-lg border border-ink-100">
          {matches.map((h) => (
            <li key={h.slug}>
              <button
                type="button"
                onClick={() => onSelect(h.slug)}
                className="block w-full px-3 py-2 text-left text-sm text-ink-900 hover:bg-brand-50"
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {words.length > 0 && choices.length > 0 && (
        <p className="mt-1 text-xs text-ink-500">{t("share.q.hospitalNotListed")}</p>
      )}
    </div>
  );
}
