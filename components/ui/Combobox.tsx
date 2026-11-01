"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { norm, prepare, prepareQuery, scoreBest, type Prepared } from "@/components/search/match";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./LiveRegion";
import { cx } from "./href";
import { FieldError, FieldHint, FieldLabel, INPUT_CLASS, describedBy, type FieldBase } from "./fieldParts";

export type ComboOption = { value: string; label: string; group?: string; keywords?: string[]; lang?: "en" | "hi" };

type Item = { value: string; label: string; lang?: "en" | "hi" };
type Indexed = { option: ComboOption; index: number };
type Section = { key: string; label: string | null; items: Indexed[] };
/** An option with its haystacks normalised once per options array. */
type PreparedOption = { option: ComboOption; order: number; hays: Prepared[]; exact: string };

/**
 * Lists longer than LONG_LIST (the share-bill hospital picker has up to ~600
 * hospitals in a city) render only the first SHOW_LIMIT matches, with a
 * "keep typing" line, so a keystroke never re-renders hundreds of rows.
 */
const LONG_LIST = 100;
const SHOW_LIMIT = 50;

function prepareOptions(options: ComboOption[]): PreparedOption[] {
  return options.map((option, order) => ({
    option,
    order,
    hays: [prepare(option.label), ...(option.keywords ?? []).map(prepare)],
    exact: norm(option.label).trim(),
  }));
}

/**
 * Filter (the shared matcher in components/search/match.ts: prefix > word
 * start > substring, filler words and Hindi oblique forms as a fallback),
 * group, and cap. `matches` counts every match; `shown` only the rendered ones.
 */
function buildSections(
  prepared: PreparedOption[],
  query: string,
  groupOrder: string[] | undefined,
  groupLabel: ((g: string) => string) | undefined
): { sections: Section[]; shown: number; matches: number } {
  const q = prepareQuery(query);
  let ranked = prepared.map((p) => ({ p, s: q ? scoreBest(p.hays, q) : 1 }));
  if (q) ranked = ranked.filter((r) => r.s > 0).sort((a, b) => b.s - a.s || a.p.order - b.p.order);

  const byGroup = new Map<string, ComboOption[]>();
  const seen: string[] = [];
  for (const { p } of ranked) {
    const g = p.option.group ?? "";
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      seen.push(g);
    }
    byGroup.get(g)!.push(p.option);
  }
  const order = groupOrder ?? [];
  const keys = [
    ...(byGroup.has("") ? [""] : []),
    ...order.filter((g) => g !== "" && byGroup.has(g)),
    ...seen.filter((g) => g !== "" && !order.includes(g)),
  ];

  const limit = prepared.length > LONG_LIST ? SHOW_LIMIT : Infinity;
  let index = 0;
  const sections: Section[] = [];
  for (const key of keys) {
    if (index >= limit) break;
    const items: Indexed[] = [];
    for (const option of byGroup.get(key)!) {
      if (index >= limit) break;
      items.push({ option, index: index++ });
    }
    sections.push({ key, label: key ? (groupLabel ? groupLabel(key) : key) : null, items });
  }
  return { sections, shown: index, matches: ranked.length };
}

/**
 * ARIA 1.2 combobox with a grouped listbox. On focus it shows the full
 * grouped list, so it doubles as a picker; typing filters label + keywords.
 * ↑/↓ move aria-activedescendant across groups, Enter picks, Escape closes
 * and a second Escape clears. It closes on an outside pointerdown, never on a
 * blur timeout. Below 768px it scrolls itself to the top of the screen on
 * focus so the list has room above the keyboard.
 *
 * A match is never picked for the person. Leaving the field (Tab, a tap
 * outside, focus elsewhere) commits only an option they arrowed to, or typed
 * text that equals exactly one option's label. Otherwise the typed text stays
 * and a note under the field asks them to choose from the list, so a field
 * never looks answered while it holds no value.
 *
 * `footerOption` (e.g. "My treatment isn't in this list") is always last and
 * never filtered out. `onChange` also gets the text typed before the pick
 * (so a "not in this list" form can start from it), and `onQueryChange`
 * reports the typed text while nothing is picked ("" once something is).
 */
export function Combobox({
  id,
  label,
  hint,
  error,
  options,
  groupOrder,
  groupLabel,
  value,
  onChange,
  onQueryChange,
  placeholder,
  footerOption,
}: FieldBase & {
  options: ComboOption[];
  groupOrder?: string[];
  groupLabel?: (g: string) => string;
  value: string | null;
  onChange: (v: string | null, typed?: string) => void;
  onQueryChange?: (text: string) => void;
  placeholder?: string;
  footerOption?: { value: string; label: string };
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  // An option reached with the arrows or the pointer (-1: none).
  const [active, setActive] = useState(-1);
  // While typing, the first match is active so Enter picks it.
  const [autoFirst, setAutoFirst] = useState(false);
  // True while the active option was reached with the arrow keys: it then also
  // gets the inset focus ring, since bg-fill alone is too faint on bg-elevated.
  const [keyboardNav, setKeyboardNav] = useState(false);
  // The typed text the "choose from the list" note was last announced for.
  const nudged = useRef<string | null>(null);

  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;
  const noteId = `${id}-pick-note`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  const prepared = useMemo(() => prepareOptions(options), [options]);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (footerOption && footerOption.value === value ? footerOption.label : null);
  const inputValue = editing ? query : (selectedLabel ?? "");

  const filter = editing ? query : "";
  const { sections, shown, matches } = buildSections(prepared, filter, groupOrder, groupLabel);
  const flat: Item[] = sections.flatMap((s) => s.items.map((it) => it.option));
  if (footerOption) flat.push(footerOption);
  const total = flat.length;
  const hidden = matches - shown;
  let activeIndex = active >= 0 && active < total ? active : -1;
  if (activeIndex < 0 && autoFirst && editing && query.trim() && shown > 0) activeIndex = 0;

  const trimmed = query.trim();
  const unresolved = editing && !open && value === null && trimmed !== "";
  const nudgeText = footerOption
    ? t("search.pickFromListOr", { option: footerOption.label })
    : t("search.pickFromList");

  function choose(item: Item) {
    const typed = editing ? query.trim() : "";
    onChange(item.value, typed);
    onQueryChange?.("");
    setEditing(false);
    setQuery("");
    setOpen(false);
    setActive(-1);
    setAutoFirst(false);
    nudged.current = null;
  }

  /** The one option whose label equals the typed text, or null. */
  function exactOption(text: string): ComboOption | null {
    const n = norm(text).trim();
    let found: ComboOption | null = null;
    for (const p of prepared) {
      if (p.exact !== n) continue;
      if (found) return null; // two options share the label: let the person choose
      found = p.option;
    }
    return found;
  }

  /** The list closes without a pick: commit an exact match, or ask for a choice. */
  function settle() {
    setOpen(false);
    setKeyboardNav(false);
    if (!editing || value !== null || !trimmed) return;
    const exact = exactOption(trimmed);
    if (exact) {
      choose(exact);
      return;
    }
    if (nudged.current !== trimmed) {
      nudged.current = trimmed;
      announce(nudgeText);
    }
  }

  // The outside-pointerdown listener always calls the latest settle().
  const settleRef = useRef(settle);
  useEffect(() => {
    settleRef.current = settle;
  });

  // Close on a pointerdown anywhere outside the field and its list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) settleRef.current();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option visible while arrowing through a long list.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${id}-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, id]);

  // Announce the number of matches once typing pauses.
  useEffect(() => {
    if (!open || !editing || !trimmed) return;
    const timer = window.setTimeout(() => announce(t("search.count", { n: matches })), 600);
    return () => window.clearTimeout(timer);
  }, [open, editing, trimmed, matches, announce, t]);

  const selectedIndex = flat.findIndex((o) => o.value === value);

  function openList(initial: number) {
    setOpen(true);
    setActive(initial);
    setAutoFirst(false);
  }

  function clear(reopen: boolean) {
    if (value !== null) onChange(null);
    onQueryChange?.("");
    setEditing(false);
    setQuery("");
    setActive(-1);
    setAutoFirst(false);
    setOpen(reopen);
    nudged.current = null;
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setQuery(text);
    setEditing(true);
    setOpen(true);
    setActive(-1);
    setAutoFirst(text.trim() !== "");
    setKeyboardNav(false);
    nudged.current = null;
    onQueryChange?.(text);
    if (value !== null) onChange(null);
  }

  function onFocus() {
    setOpen(true);
    setActive(selectedIndex);
    setAutoFirst(editing);
    if (window.matchMedia("(max-width: 47.99rem)").matches) {
      wrapRef.current?.scrollIntoView({ block: "start" });
    }
  }

  function move(delta: 1 | -1) {
    if (total === 0) return;
    const next = activeIndex < 0 ? (delta === 1 ? 0 : total - 1) : (activeIndex + delta + total) % total;
    setActive(next);
    setAutoFirst(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") setKeyboardNav(true);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList(e.altKey ? activeIndex : selectedIndex >= 0 ? selectedIndex : 0);
        else move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList(selectedIndex >= 0 ? selectedIndex : total - 1);
        else move(-1);
        break;
      case "Enter":
        if (open) {
          // Never submit the surrounding form while the list is open.
          e.preventDefault();
          if (activeIndex >= 0) choose(flat[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        } else if (inputValue) {
          e.preventDefault();
          clear(false);
        }
        break;
      case "Tab":
        // ARIA APG: Tab accepts an option the person arrowed to; focus then
        // moves on as usual. Anything else is settled like a blur.
        if (open && keyboardNav && activeIndex >= 0) choose(flat[activeIndex]);
        else settle();
        break;
    }
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Focus moved to another control outside the widget (not an option click,
    // which keeps focus in the input). No timeout involved.
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current && !wrapRef.current.contains(next)) settle();
  }

  function renderOption(item: Item, index: number) {
    const isActive = index === activeIndex;
    return (
      <li
        key={`${index}-${item.value}`}
        id={optionId(index)}
        role="option"
        aria-selected={isActive}
        lang={item.lang}
        onClick={() => choose(item)}
        onPointerMove={() => {
          if (keyboardNav) setKeyboardNav(false);
          if (!isActive) {
            setActive(index);
            setAutoFirst(false);
          }
        }}
        className={cx(
          "flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-body text-label aria-selected:bg-fill",
          isActive && keyboardNav && "outline-3 outline-offset-[-3px] outline-focus"
        )}
      >
        <span className="min-w-0 flex-1">{item.label}</span>
        {item.value === value && <Icon name="check" className="size-5 shrink-0 text-accent" />}
      </li>
    );
  }

  return (
    <div ref={wrapRef}>
      <FieldLabel htmlFor={id} id={labelId}>
        {label}
      </FieldLabel>
      <FieldHint id={id}>{hint}</FieldHint>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error, unresolved && noteId)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={inputValue}
          onChange={onInputChange}
          onFocus={onFocus}
          onClick={() => {
            if (!open) openList(selectedIndex);
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className={cx(INPUT_CLASS, "pl-4 pr-11")}
        />
        {inputValue && (
          <IconButton
            icon="x"
            label={t("search.clear")}
            onClick={() => {
              // Focus first: onFocus would otherwise re-activate the old selection.
              inputRef.current?.focus();
              clear(true);
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2"
          />
        )}
        {/* z-35: above the phone StickyActionBar (z-30), under the sticky
            header (z-40). globals.css also hides that bar while a list is open.
            The height cap keeps the list above the keyboard on short screens. */}
        <div
          hidden={!open}
          // Keep focus in the input when an option is pressed.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-35 mt-2 max-h-[max(9rem,min(50dvh,calc(100dvh_-_14rem),360px))] overflow-y-auto rounded-card bg-elevated py-2 shadow-pop"
        >
          {matches === 0 && (
            <p className="px-4 py-3 text-callout text-label-2">{t("search.count", { n: 0 })}</p>
          )}
          <ul id={listboxId} role="listbox" aria-labelledby={labelId}>
            {sections.map((s, si) =>
              s.label ? (
                <li key={s.key} role="presentation">
                  <ul role="group" aria-labelledby={`${id}-grp-${si}`}>
                    <li
                      role="presentation"
                      id={`${id}-grp-${si}`}
                      className="px-4 pt-3 pb-1 text-footnote font-semibold text-label-2"
                    >
                      {s.label}
                    </li>
                    {s.items.map((it) => renderOption(it.option, it.index))}
                  </ul>
                </li>
              ) : (
                <Fragment key="_ungrouped">{s.items.map((it) => renderOption(it.option, it.index))}</Fragment>
              )
            )}
            {hidden > 0 && (
              <li role="presentation" className="px-4 py-3 text-callout text-label-2">
                {t("search.keepTyping", { n: hidden })}
              </li>
            )}
            {footerOption && renderOption(footerOption, shown)}
          </ul>
        </div>
      </div>
      {unresolved && (
        <p id={noteId} className="mt-2 flex gap-1.5 text-callout text-label-2">
          <Icon name="info" className="mt-0.5 size-4.5 shrink-0" />
          <span>{nudgeText}</span>
        </p>
      )}
      <FieldError id={id} message={error} />
    </div>
  );
}
