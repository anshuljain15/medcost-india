"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChipRow } from "@/components/ui/ChoiceChip";
import { DataText } from "@/components/ui/DataText";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { useAnnounce } from "@/components/ui/LiveRegion";
import { Money, MoneyRange } from "@/components/ui/Money";
import { Skeleton } from "@/components/ui/Skeleton";
import { cx } from "@/components/ui/href";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { MIN_QUERY_LENGTH, normalize as medicineKey, searchMedicines, type MedicineHit } from "@/lib/medicineShards";
import { loadHospitalIndex, loadProcedureIndex } from "@/lib/staticData";
import type { MedicinesMeta } from "@/lib/types";
import { PIN_RE, prepareQuery } from "./match";
import {
  ROWS_PER_GROUP,
  buildGroups,
  emptyStateGroups,
  prepareHospitals,
  preparePages,
  prepareProcedures,
  type GroupKey,
  type PreparedHospitals,
  type PreparedProcedures,
  type SearchGroup,
  type SearchItem,
  type SearchScope,
} from "./results";

// Recipes (docs/design-system.md §5.4 UniversalSearch, Combobox options).
const FIELD =
  "h-14 w-full rounded-control border border-control bg-surface pl-12 pr-12 text-body text-label placeholder:text-label-3 transition-colors duration-150 focus-visible:border-accent";
const POPOVER =
  "absolute inset-x-0 top-full z-50 mt-2 max-h-[min(60dvh,480px)] overflow-y-auto rounded-card bg-elevated py-2 shadow-pop";
const OPTION = "flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 text-body text-label aria-selected:bg-fill";
const CHIP =
  "inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border border-control bg-surface px-4 text-callout font-medium text-label transition-colors duration-150 hover:bg-fill";

const ITEM_ICON: Record<Exclude<SearchItem["kind"], "page">, IconName> = {
  procedure: "clipboard",
  medicine: "pill",
  seeAllMedicines: "search",
  hospital: "hospital",
  pin: "store",
};

export type UniversalSearchProps = {
  /** hero: field with a popover (home, /hospitals, 404). sheet: inline list inside SearchSheet. */
  variant?: "hero" | "sheet";
  /** "hospitals" (the /hospitals page) searches hospital names and PINs only. */
  scope?: SearchScope;
  /** Visible label (sr-only in the sheet). Defaults to search.label. */
  label?: string;
  /** Defaults to search.placeholder for scope "all"; none for "hospitals". */
  placeholder?: string;
  /**
   * The Jan Aushadhi list date (MedicinesMeta.janAushadhi.snapshotDate), passed
   * down by a server component. Without it the medicines footnote says "date
   * not recorded"; a date is never guessed.
   */
  medicinesDate?: string | null;
  /**
   * The brand MRP source (MedicinesMeta.brands: the Kaggle A-Z dataset, Nov
   * 2022, CC BY-SA 4.0), passed down by a server component. Brand rows are
   * credited to it, never to PMBJP; without it a brand row gets no footnote
   * rather than a wrong one.
   */
  medicinesBrands?: MedicinesMeta["brands"] | null;
  /** Focus the field once mounted (the sheet). */
  autoFocus?: boolean;
  /** Called after a result is chosen (the sheet closes itself). */
  onNavigate?: () => void;
};

/**
 * One combobox for treatments, medicines, hospitals and pages (§2.7), ARIA 1.2:
 * grouped listbox (role="group" + aria-labelledby), ↑/↓ move
 * aria-activedescendant across groups, Enter opens the result, Escape closes
 * and a second Escape clears. The popover closes on an outside pointerdown,
 * never on a blur timeout. The result count goes to the polite live region.
 *
 * Indexes come only from lib/staticData.ts and are fetched on the first focus
 * of the field, never on page load. Medicines use searchMedicines(q, 4), which
 * needs 3 Latin letters (the shards are Latin).
 */
export function UniversalSearch({
  variant = "hero",
  scope = "all",
  label,
  placeholder,
  medicinesDate,
  medicinesBrands,
  autoFocus,
  onNavigate,
}: UniversalSearchProps) {
  const { t, dict, formatDate } = useTranslation();
  const announce = useAnnounce();
  const router = useRouter();
  const baseId = `us${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inputId = `${baseId}-input`;
  const labelId = `${baseId}-label`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const groupId = (g: GroupKey) => `${baseId}-grp-${g}`;
  const noteId = (note: string) => `${baseId}-note-${note}`;

  const sheet = variant === "sheet";
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inflight = useRef({ procedures: false, hospitals: false });

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  // While typing, the first result is active so Enter opens it.
  const [autoFirst, setAutoFirst] = useState(false);
  // The active option was reached with the arrow keys: it also gets the inset
  // focus ring, since bg-fill alone is faint on bg-elevated.
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [procedures, setProcedures] = useState<PreparedProcedures | null>(null);
  const [hospitals, setHospitals] = useState<PreparedHospitals | null>(null);
  const [med, setMed] = useState<{ query: string; hits: MedicineHit[] } | null>(null);

  const deferred = useDeferredValue(query);
  const raw = deferred.trim();
  const q = useMemo(() => prepareQuery(raw), [raw]);
  const hasQuery = q !== null;
  const isPin = PIN_RE.test(raw);

  const medEligible =
    scope === "all" && !isPin && medicineKey(raw).replace(/ /g, "").length >= MIN_QUERY_LENGTH;
  const medHits = medEligible && med !== null && med.query === raw ? med.hits : null;
  const medPending = medEligible && medHits === null;

  const pages = useMemo(() => preparePages((key) => t(key)), [t]);

  const groups: SearchGroup[] = useMemo(() => {
    if (!q) return scope === "all" ? emptyStateGroups() : [];
    return buildGroups({ q, raw, scope, procedures, hospitals, pages, medicines: medHits });
  }, [q, raw, scope, procedures, hospitals, pages, medHits]);

  const flat = groups.flatMap((g) => g.items);
  const indexOf = new Map(flat.map((item, i) => [item.key, i]));
  const resultCount = flat.filter((item) => item.kind !== "seeAllMedicines").length;
  let activeIndex = activeKey === null ? -1 : (indexOf.get(activeKey) ?? -1);
  if (activeIndex < 0 && autoFirst && hasQuery && flat.length > 0) activeIndex = 0;

  const indexLoading = (scope === "all" && procedures === null) || hospitals === null;
  const showSkeleton = hasQuery && flat.length === 0 && (indexLoading || medPending);
  const settled = hasQuery && !indexLoading && !medPending;
  const showNone = settled && flat.length === 0;
  const showMedicinesMin = showNone && scope === "all" && !isPin && !medEligible;
  const showTry = scope === "all" && !hasQuery;
  const panelHasContent = scope === "all" || hasQuery;
  const panelVisible = sheet || (open && panelHasContent);
  const expanded = panelVisible && flat.length > 0;
  const activeOptionId = expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  const noneText = scope === "hospitals" ? t("city.noMatch") : t("search.none", { q: raw });
  const announcement = !settled ? null : resultCount > 0 ? t("search.count", { n: resultCount }) : noneText;

  // ---- Effects -----------------------------------------------------------

  // Close the popover on a pointerdown anywhere outside the widget.
  useEffect(() => {
    if (sheet || !open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [sheet, open]);

  // Medicines: the existing shard search, once typing pauses briefly.
  useEffect(() => {
    if (!medEligible) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchMedicines(raw, ROWS_PER_GROUP).then((hits) => {
        if (!cancelled) setMed({ query: raw, hits });
      });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [medEligible, raw]);

  // Announce the result count once typing pauses (polite live region).
  useEffect(() => {
    if (!announcement || !panelVisible) return;
    const timer = window.setTimeout(() => announce(announcement), 600);
    return () => window.clearTimeout(timer);
  }, [announcement, panelVisible, raw, announce]);

  // Keep the active option visible while arrowing through a long list.
  useEffect(() => {
    if (!keyboardNav || !activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [keyboardNav, activeOptionId]);

  // The sheet focuses the field after its <dialog> has opened (the dialog's
  // showModal() runs in the parent's effect, after this one is scheduled).
  useEffect(() => {
    if (!autoFocus) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [autoFocus]);

  // ---- Handlers ----------------------------------------------------------

  /** Fetch the indexes on first focus (cached for the session; retried if a fetch failed). */
  function ensureIndexes() {
    const busy = inflight.current;
    if (scope === "all" && (procedures === null || procedures.rows.length === 0) && !busy.procedures) {
      busy.procedures = true;
      void loadProcedureIndex().then((idx) => {
        busy.procedures = false;
        setProcedures(prepareProcedures(idx));
      });
    }
    if ((hospitals === null || hospitals.rows.length === 0) && !busy.hospitals) {
      busy.hospitals = true;
      void loadHospitalIndex().then((idx) => {
        busy.hospitals = false;
        setHospitals(prepareHospitals(idx));
      });
    }
  }

  function onFocus() {
    ensureIndexes();
    if (sheet) return;
    if (scope === "all" || query.trim()) setOpen(true);
    // Below 768px: put the field under the header so results fill the space
    // above the keyboard (scroll-padding-top does the offset).
    if (window.matchMedia("(max-width: 47.99rem)").matches) {
      fieldRef.current?.scrollIntoView({ block: "start" });
    }
  }

  function setText(text: string) {
    setQuery(text);
    setActiveKey(null);
    setAutoFirst(text.trim() !== "");
    setKeyboardNav(false);
    if (!sheet) setOpen(scope === "all" || text.trim() !== "");
  }

  function clear() {
    setText("");
    inputRef.current?.focus();
  }

  function applyChip(text: string) {
    setText(text);
    ensureIndexes();
    inputRef.current?.focus();
  }

  function finish() {
    if (!sheet) setOpen(false);
    setActiveKey(null);
    setAutoFirst(false);
    onNavigate?.();
  }

  function move(delta: 1 | -1) {
    if (flat.length === 0) return;
    const next =
      activeIndex < 0 ? (delta === 1 ? 0 : flat.length - 1) : (activeIndex + delta + flat.length) % flat.length;
    setActiveKey(flat[next].key);
    setAutoFirst(false);
    setKeyboardNav(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        if (!sheet && !open) setOpen(panelHasContent);
        move(e.key === "ArrowDown" ? 1 : -1);
        break;
      case "Enter":
        if (panelVisible && activeIndex >= 0) {
          e.preventDefault();
          router.push(flat[activeIndex].href);
          finish();
        }
        break;
      case "Escape":
        // In the sheet, Escape closes the <dialog> natively.
        if (sheet) break;
        if (open && panelHasContent) {
          e.preventDefault();
          setOpen(false);
          setActiveKey(null);
          setAutoFirst(false);
        } else if (query) {
          e.preventDefault();
          setQuery("");
          setActiveKey(null);
          setAutoFirst(false);
        }
        break;
    }
  }

  // ---- Rendering ---------------------------------------------------------

  /** A translated sentence with <Money> in place of {price}, so money never bypasses <Money>. */
  function withPrice(key: string, value: number) {
    const marker = "\u0000";
    const text = t(key, { price: marker });
    const at = text.indexOf(marker);
    if (at < 0) return text;
    return (
      <>
        {text.slice(0, at)}
        <Money value={value} perUnit />
        {text.slice(at + marker.length)}
      </>
    );
  }

  function groupHeading(g: GroupKey): string | null {
    switch (g) {
      case "treatments":
        return t("search.groupTreatments");
      case "medicines":
        return t("search.groupMedicines");
      case "hospitals":
        return t("search.groupHospitals");
      case "pages":
        return t("search.groupPages");
      default:
        return null; // the PIN row stands alone at the top
    }
  }

  // Group footers: the source and date of the prices shown in that group.
  // Medicines get one note per source actually shown: Jan Aushadhi (PMBJP)
  // for generic rows, the brand dataset (with its licence) for brand rows.
  function groupNotes(g: SearchGroup): { id: string; text: string }[] {
    if (g.key === "treatments") {
      const date = procedures?.date;
      return [
        {
          id: noteId("treatments"),
          text: t("search.treatmentsSource", { date: date ? formatDate(date) : t("source.noDate") }),
        },
      ];
    }
    if (g.key === "medicines") {
      const kinds = new Set(g.items.flatMap((item) => (item.kind === "medicine" ? [item.medKind] : [])));
      const notes: { id: string; text: string }[] = [];
      if (kinds.has("g")) {
        notes.push({
          id: noteId("medicines-ja"),
          text: t("search.medicinesSource", { date: medicinesDate ? formatDate(medicinesDate) : t("source.noDate") }),
        });
      }
      if (kinds.has("b") && medicinesBrands) {
        notes.push({
          id: noteId("medicines-brands"),
          text: t("medicines.brandsCredit", {
            name: medicinesBrands.name,
            date: formatDate(medicinesBrands.snapshotDate),
            license: medicinesBrands.license,
          }),
        });
      }
      return notes;
    }
    return [];
  }

  function renderOption(item: SearchItem) {
    const index = indexOf.get(item.key) ?? -1;
    const active = index === activeIndex;
    let icon: IconName;
    let title: React.ReactNode;
    let subtitle: React.ReactNode = null;
    let describedBy: string | undefined;
    switch (item.kind) {
      case "procedure":
        icon = ITEM_ICON.procedure;
        title = <DataText>{item.name}</DataText>;
        subtitle = <MoneyRange low={item.low} high={item.high} />;
        describedBy = noteId("treatments");
        break;
      case "medicine":
        icon = ITEM_ICON.medicine;
        title = <DataText>{item.name}</DataText>;
        // A brand hit carries the brand's own 2022 price, never a Jan Aushadhi one.
        // Each row points at its own source's note only.
        if (item.medKind === "b") {
          subtitle = item.perUnit !== null ? withPrice("medicines.perUnitBrand", item.perUnit) : null;
          describedBy = medicinesBrands ? noteId("medicines-brands") : undefined;
        } else {
          subtitle = item.perUnit !== null ? withPrice("medicines.perUnitJa", item.perUnit) : t("medicines.noJaPrice");
          describedBy = noteId("medicines-ja");
        }
        break;
      case "seeAllMedicines":
        icon = ITEM_ICON.seeAllMedicines;
        title = t("search.seeAllMedicines", { q: item.query });
        break;
      case "hospital":
        icon = ITEM_ICON.hospital;
        title = <DataText>{item.name}</DataText>;
        subtitle = (
          <>
            <DataText>{item.city}</DataText>
            {item.pincode && ` · ${t("city.pin", { pin: item.pincode })}`}
          </>
        );
        break;
      case "page":
        icon = item.icon;
        title = t(item.titleKey);
        break;
      case "pin":
        icon = ITEM_ICON.pin;
        title = t("search.pinRow", { pin: item.pin });
        break;
    }
    return (
      <li key={item.key} role="presentation">
        <Link
          href={item.href}
          prefetch={false}
          id={optionId(index)}
          role="option"
          aria-selected={active}
          aria-describedby={describedBy}
          tabIndex={-1}
          onClick={finish}
          onPointerMove={() => {
            if (keyboardNav) setKeyboardNav(false);
            if (!active) {
              setActiveKey(item.key);
              setAutoFirst(false);
            }
          }}
          className={cx(OPTION, active && keyboardNav && "outline-3 outline-offset-[-3px] outline-focus")}
        >
          <Icon name={icon} className="size-6 shrink-0 text-label-2" />
          <span className="min-w-0 flex-1">
            <span className="block">{title}</span>
            {subtitle && <span className="block text-callout text-label-2">{subtitle}</span>}
          </span>
        </Link>
      </li>
    );
  }

  const tryRow = (
    <ChipRow wrap label={t("search.try")}>
      <span aria-hidden="true" className="inline-flex min-h-11 items-center text-callout text-label-2">
        {t("search.try")}
      </span>
      {dict.search.tryChips.map((chip) => (
        <button key={chip} type="button" className={CHIP} onClick={() => applyChip(chip)}>
          {chip}
        </button>
      ))}
    </ChipRow>
  );

  const panel = (
    <>
      {showTry && <div className="px-4 pt-1 pb-2">{tryRow}</div>}
      {showSkeleton && (
        <div className="space-y-2 px-4 py-2">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      )}
      {showNone && (
        <div className="space-y-1 px-4 py-3 text-callout text-label-2">
          <p>{noneText}</p>
          {showMedicinesMin && <p>{t("search.medicinesMin")}</p>}
        </div>
      )}
      <ul id={listboxId} role="listbox" aria-labelledby={labelId}>
        {groups.map((g) => {
          const heading = groupHeading(g.key);
          const notes = groupNotes(g);
          if (!heading) return <Fragment key={g.key}>{g.items.map(renderOption)}</Fragment>;
          return (
            <li key={g.key} role="presentation">
              <ul role="group" aria-labelledby={groupId(g.key)}>
                <li
                  role="presentation"
                  id={groupId(g.key)}
                  className="px-4 pt-3 pb-1 text-footnote font-semibold text-label-2"
                >
                  {heading}
                </li>
                {g.items.map(renderOption)}
                {notes.map((note) => (
                  <li key={note.id} role="presentation" id={note.id} className="px-4 pt-2 pb-2 text-footnote text-label-2">
                    {note.text}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );

  // Keep focus in the field when an option or chip is pressed.
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  return (
    <div
      ref={wrapRef}
      onBlur={(e) => {
        // Focus moved to a control outside the widget. No timeout involved.
        const next = e.relatedTarget as Node | null;
        if (!sheet && next && !e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <label id={labelId} htmlFor={inputId} className={sheet ? "sr-only" : "mb-2 block text-headline text-label"}>
        {label ?? t("search.label")}
      </label>
      <div ref={fieldRef} className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          placeholder={placeholder ?? (scope === "all" ? t("search.placeholder") : undefined)}
          value={query}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          onClick={() => {
            if (!sheet && !open && panelHasContent) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cx(FIELD, !sheet && "shadow-card")}
        />
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-6 -translate-y-1/2 text-label-2" />
        {query && (
          <IconButton
            icon="x"
            label={t("search.clear")}
            onClick={clear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          />
        )}
        {!sheet && (
          <div hidden={!panelVisible} onPointerDown={keepFocus} onMouseDown={keepFocus} className={POPOVER}>
            {panel}
          </div>
        )}
      </div>
      {/* Hero: the "Try:" chips sit under the field until the popover (which repeats them) covers it. */}
      {!sheet && scope === "all" && !query.trim() && (
        <div className={cx("mt-3", panelVisible && "invisible")}>{tryRow}</div>
      )}
      {sheet && (
        <div onPointerDown={keepFocus} onMouseDown={keepFocus} className="-mx-4 mt-3">
          {panel}
        </div>
      )}
    </div>
  );
}

export default UniversalSearch;
