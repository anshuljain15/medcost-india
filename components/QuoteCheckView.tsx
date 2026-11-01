"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionLink,
  Button,
  Callout,
  Card,
  ChipRow,
  ChoiceChip,
  Combobox,
  DataText,
  Disclosure,
  InlineLink,
  InsetGroup,
  ListRow,
  Money,
  MoneyField,
  MoneyRange,
  PageHeader,
  PageNotes,
  PageShell,
  RangeBar,
  SegmentedControl,
  SourceNote,
  StickyActionBar,
  VerdictCard,
  type ComboOption,
} from "@/components/ui";
import ShareButton from "@/components/ShareButton";
import { GROUP_LABEL_KEY } from "@/components/ProcedureListView";
import { assessQuote, type QuotePosition, type Ward } from "@/lib/billCheck";
import { formatINR } from "@/lib/format";
import { GROUP_ORDER, procedureGroup, type GroupKey } from "@/lib/procedureGroups";
import { synonymsFor } from "@/lib/search/synonyms";
import type { Procedure } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/** The slice of a procedure the checker needs, built by the server page. */
export type QuoteProcedure = {
  slug: string;
  name: string;
  low: number | null;
  high: number | null;
  sourceUrl: string;
  /** Hospital-wise [min, avg] pairs, names dropped. */
  prices: [min: number | null, avg: number | null][];
  /** CGHS ward amounts, already read with parseCghsAmount (null = not listed). */
  cghs: {
    name: string;
    code: string;
    nabh: boolean;
    general: number | null;
    semiPrivate: number | null;
    private: number | null;
    /** The list's GST marker (lib/format.ts cghsGst): "plus" means the amounts are before GST. */
    gst: "plus" | "incl" | null;
  } | null;
};

type Kind = "quote" | "bill";
type WardChoice = Ward | "notSure";
type Status = "within" | "above" | "below" | "unknown";

const NOT_LISTED = "__not-listed";
const WARDS: Ward[] = ["general", "semiPrivate", "private"];

const WARD_LABEL_KEY: Record<WardChoice, string> = {
  general: "quote.ward.general",
  semiPrivate: "quote.ward.semiPrivate",
  private: "quote.ward.private",
  notSure: "quote.ward.notSure",
};

// lowerHalf and upperHalf both read as "within". Only "above" is amber.
const STATUS: Record<QuotePosition, Status> = {
  below: "below",
  lowerHalf: "within",
  upperHalf: "within",
  above: "above",
  unknown: "unknown",
};

const VERDICT_KEY: Record<QuotePosition, string> = {
  below: "quote.verdict.below",
  lowerHalf: "quote.verdict.lowerHalf",
  upperHalf: "quote.verdict.upperHalf",
  above: "quote.verdict.above",
  unknown: "quote.verdict.unknown",
};

/**
 * assessQuote (lib/billCheck.ts) takes a full Procedure; rebuild one from the
 * slim row (no hospital names cross to the client). Only its market-range
 * position and hospital counts are used here. The CGHS comparison uses the
 * slim row's ward amounts, which the server already read with
 * parseCghsAmount, so the CGHS reference is left out.
 */
function asProcedure(p: QuoteProcedure): Procedure {
  return {
    slug: p.slug,
    name: p.name,
    cityLow: p.low,
    cityHigh: p.high,
    hospitalPrices: p.prices.map(([min, avg]) => ({ hospitalName: "", hospitalSlug: null, min, max: null, avg })),
    cghsReference: null,
    source: "hexahealth",
    sourceUrl: p.sourceUrl,
  };
}

function WardAmounts({ cghs }: { cghs: NonNullable<QuoteProcedure["cghs"]> }) {
  const { t } = useTranslation();
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2">
      {WARDS.map((w) => (
        <div key={w}>
          <dt className="text-footnote text-label-2">{t(WARD_LABEL_KEY[w])}</dt>
          <dd className="text-headline tabular-nums text-label">
            <Money value={cghs[w]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Stand-in for {proc}, so the procedure name can be data text inside a translated sentence. */
const PROC = "\u0000";

/**
 * /check-quote (focus mode): one screen. What you have (a quote or a final
 * bill), the treatment, the amount and, only when the treatment has a CGHS
 * match, the room type. The result appears below the form on submit, takes
 * focus, and then follows later edits live.
 */
export default function QuoteCheckView({
  procedures,
  hexahealthDate,
  cghsDate,
  cghsUrl,
}: {
  procedures: QuoteProcedure[];
  /** Retrieval dates; null renders "date not recorded", never a guess. */
  hexahealthDate: string | null;
  cghsDate: string | null;
  cghsUrl: string;
}) {
  const { t, dict, locale } = useTranslation();
  const [kind, setKind] = useState<Kind>("quote");
  const [slug, setSlug] = useState<string | null>(null);
  const [amountText, setAmountText] = useState("");
  const [ward, setWard] = useState<WardChoice>("notSure");
  const [submitted, setSubmitted] = useState(false);
  // Set by a submit with a missing field; the inline errors then follow edits.
  const [attempted, setAttempted] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const verdictRef = useRef<HTMLHeadingElement>(null);

  // /check-quote#knee-replacement-surgery preselects, so procedure pages,
  // hospital pages and shared links can land here with the treatment chosen.
  useEffect(() => {
    const fromHash = () => {
      let hash = "";
      try {
        hash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      if (procedures.some((p) => p.slug === hash)) setSlug(hash);
    };
    // The hash only exists in the browser, so it is read after mount.
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [procedures]);

  // On submit, move focus to the verdict heading once it has rendered.
  useEffect(() => {
    if (focusTick > 0) verdictRef.current?.focus();
  }, [focusTick]);

  const options = useMemo<ComboOption[]>(
    () =>
      [...procedures]
        .sort((a, b) => a.name.localeCompare(b.name, "en"))
        .map((p) => ({
          value: p.slug,
          label: p.name,
          group: procedureGroup(p.slug).group,
          keywords: synonymsFor(p.slug),
          lang: locale === "hi" ? "en" : undefined,
        })),
    [procedures, locale]
  );

  const procedure = procedures.find((p) => p.slug === slug) ?? null;
  const amount = amountText ? Number(amountText) : NaN;
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const canSubmit = procedure !== null && hasAmount;
  const isBill = kind === "bill";
  const procedureError = attempted && procedure === null ? t("quote.err.procedure") : undefined;
  const amountError = attempted && !hasAmount ? t("quote.err.amount") : undefined;

  // The button is aria-disabled, not disabled, so it stays in the Tab order.
  // Pressing it early names what is missing and moves focus there.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) {
      setAttempted(true);
      document.getElementById(procedure === null ? "quote-procedure" : "quote-amount")?.focus();
      return;
    }
    setAttempted(false);
    setSubmitted(true);
    setFocusTick((n) => n + 1);
  }

  function checkAgain() {
    const field = document.getElementById("quote-amount");
    if (field instanceof HTMLInputElement) {
      field.focus({ preventScroll: true });
      field.scrollIntoView({ block: "center" });
      field.select();
    }
  }

  const askList = isBill ? dict.quote.askListBill : dict.quote.askList;

  let result: React.ReactNode = null;
  if (submitted && procedure && hasAmount) {
    const assessment = assessQuote(asProcedure(procedure), amount, "general");
    const status = STATUS[assessment.position];
    const { low, high, cghs } = procedure;
    const hasRange = status !== "unknown" && low !== null && high !== null;
    const wardRate = cghs && ward !== "notSure" ? cghs[ward] : null;
    // The procedure name stays English inside a Hindi sentence: DataText marks
    // it lang="en" (WCAG 3.1.2) and keeps browser translation off it.
    const [verdictBefore, verdictAfter = ""] = t(VERDICT_KEY[assessment.position], { proc: PROC }).split(PROC);
    const shareVars = {
      proc: procedure.name,
      quote: formatINR(amount),
      low: formatINR(low),
      high: formatINR(high),
    };

    result = (
      <div className="mt-10 space-y-6">
        <VerdictCard
          status={status}
          sentence={
            <>
              {verdictBefore}
              <DataText>{procedure.name}</DataText>
              {verdictAfter}
            </>
          }
          spokenSentence={t(VERDICT_KEY[assessment.position], { proc: procedure.name })}
          headingRef={verdictRef}
        >
          {hasRange && (
            <>
              <RangeBar
                low={low}
                high={high}
                amount={amount}
                above={status === "above"}
                ariaLabel={t("quote.rangeAria", {
                  amount: formatINR(amount),
                  low: formatINR(low),
                  high: formatINR(high),
                })}
              />
              <div>
                <p className="text-callout text-label">
                  <MoneyRange low={low} high={high} /> · {t("source.marketQualifier")}
                </p>
                <SourceNote source="HexaHealth" href={procedure.sourceUrl} date={hexahealthDate} anchor="market-prices" />
              </div>
            </>
          )}
          <div>
            <h3 className="mb-2 text-headline text-label">{t("quote.whatToDo")}</h3>
            <ul>
              {status === "below" && <li>{t("quote.belowTip")}</li>}
              {askList.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
          <Callout tone="info" title={t("quote.rightsHeading")}>
            <p>{t("quote.rights")}</p>
          </Callout>
        </VerdictCard>

        {assessment.hospitalsCompared > 0 && (
          <Card>
            <h2 className="text-headline text-label">{t("quote.hospitalsHeading")}</h2>
            <p className="mt-2 text-body text-label">
              {t(assessment.hospitalsBelow === 1 ? "quote.hospitalsBelowOne" : "quote.hospitalsBelow", {
                below: assessment.hospitalsBelow,
                n: assessment.hospitalsCompared,
              })}
            </p>
            <div className="mt-2">
              <ActionLink href={`/procedures/${procedure.slug}#hospitals`}>{t("quote.seeHospitals")}</ActionLink>
            </div>
          </Card>
        )}

        {cghs && (
          <Card>
            <h2 className="text-headline text-label">{t("quote.cghsHeading")}</h2>
            {ward !== "notSure" && wardRate !== null ? (
              <p className="mt-2 text-body text-label">
                {t("quote.cghsMultiple", {
                  x: (amount / wardRate).toLocaleString("en-IN", { maximumFractionDigits: 1 }),
                  ward: t(WARD_LABEL_KEY[ward]),
                  rate: formatINR(wardRate),
                })}
              </p>
            ) : (
              <>
                {ward === "notSure" && <p className="mt-2 text-body text-label">{t("quote.cghsPickRoom")}</p>}
                <WardAmounts cghs={cghs} />
              </>
            )}
            {/* What is compared, and what the rate means, stay next to the multiple:
                the matched line can be narrower than the treatment, and a bare
                "N times the CGHS rate" reads like a verdict. */}
            <p className="mt-3 text-callout text-label-2">
              {t("procedure.matchedLine")} <DataText>{cghs.name}</DataText> ({cghs.code})
              {cghs.nabh && ` · ${t("procedure.govTier")}`}
              {cghs.gst && ` · ${t(cghs.gst === "plus" ? "common.plusGst" : "common.inclGst")}`}
            </p>
            <p className="mt-1 text-callout text-label-2">{t("quote.cghsExplain")}</p>
            <SourceNote
              source={new URL(cghsUrl).hostname}
              href={cghsUrl}
              qualifier={t("source.cghs")}
              date={cghsDate}
              anchor="govt-rates"
            />
          </Card>
        )}

        {/* Missing data stays a visible state, as quiet lines rather than cards. */}
        {(assessment.hospitalsCompared === 0 || !cghs) && (
          <div className="space-y-2 px-4 text-footnote text-label-2">
            {assessment.hospitalsCompared === 0 && <p>{t("quote.hospitalsNone")}</p>}
            {!cghs && (
              <p>
                {t("quote.cghsNone")}{" "}
                <InlineLink href="/methodology#govt-rates">{t("procedure.howWeMatch")}</InlineLink>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <ShareButton
            text={isBill ? t("quote.shareTextBill", shareVars) : t("quote.shareText", shareVars)}
            path={`/check-quote#${procedure.slug}`}
          />
          <Button variant="plain" onClick={checkAgain}>
            {t("quote.again")}
          </Button>
        </div>

        <InsetGroup>
          <ListRow href="/share-bill" leading="users" title={t("quote.sharePaid")} />
        </InsetGroup>
      </div>
    );
  }

  return (
    // Room for the phone's StickyActionBar comes from the body (app/globals.css).
    <PageShell>
      <PageHeader title={t("quote.title")} lead={t("quote.lead")} />

      <form onSubmit={onSubmit} noValidate>
        <div className="space-y-6">
          <SegmentedControl<Kind>
            name="quote-kind"
            legend={t("quote.kindLabel")}
            options={[
              { value: "quote", label: t("quote.kind.quote") },
              { value: "bill", label: t("quote.kind.bill") },
            ]}
            value={kind}
            onChange={setKind}
          />

          <div>
            <Combobox
              id="quote-procedure"
              label={t("quote.procedureLabel")}
              placeholder={t("quote.procedureSearch")}
              options={options}
              groupOrder={GROUP_ORDER}
              groupLabel={(g) => t(GROUP_LABEL_KEY[g as GroupKey] ?? "procedures.group.other")}
              value={slug}
              onChange={setSlug}
              error={procedureError}
              footerOption={{ value: NOT_LISTED, label: t("quote.notListed") }}
            />
            {slug === NOT_LISTED && (
              <div className="mt-3">
                <Callout tone="info">
                  <p>
                    {t("quote.notListedBody")} <InlineLink href="/share-bill">{t("nav.shareBill")}</InlineLink>
                  </p>
                </Callout>
              </div>
            )}
          </div>

          <MoneyField
            id="quote-amount"
            label={isBill ? t("quote.amountLabelBill") : t("quote.amountLabel")}
            hint={t("quote.amountHint")}
            error={amountError}
            value={amountText}
            onValueChange={setAmountText}
          />

          {/* Room type changes the result only through the CGHS rate, so it is
              shown only for treatments with a confident CGHS match. */}
          {procedure?.cghs && (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-headline text-label">{t("quote.wardLabel")}</legend>
              <ChipRow wrap>
                {(["general", "semiPrivate", "private", "notSure"] as WardChoice[]).map((w) => (
                  <ChoiceChip
                    key={w}
                    type="radio"
                    name="quote-ward"
                    value={w}
                    checked={ward === w}
                    onChange={(checked) => {
                      if (checked) setWard(w);
                    }}
                  >
                    {t(WARD_LABEL_KEY[w])}
                  </ChoiceChip>
                ))}
              </ChipRow>
            </fieldset>
          )}
        </div>

        <StickyActionBar>
          {/* aria-disabled keeps the disabled look (Button styles it) without
              leaving the Tab order: pressing it early names what is missing. */}
          <Button type="submit" size="lg" block aria-disabled={canSubmit ? undefined : true}>
            {isBill ? t("quote.submitBill") : t("quote.submit")}
          </Button>
        </StickyActionBar>
      </form>

      {!submitted && (
        <div className="mt-10">
          <Disclosure summary={t("quote.askDisclosure")}>
            <ul className="list-disc space-y-2 pl-5 marker:text-label-3">
              {dict.quote.askList.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
            <p>{t("quote.rights")}</p>
          </Disclosure>
        </div>
      )}

      {result}

      <PageNotes anchor="checks" linkKey="check.methodologyLink">
        <p>{t("quote.disclaimer")}</p>
      </PageNotes>
    </PageShell>
  );
}
