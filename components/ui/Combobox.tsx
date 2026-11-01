"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { useAnnounce } from "./LiveRegion";
import { cx } from "./href";
import { FieldError, FieldHint, FieldLabel, INPUT_CLASS, describedBy, type FieldBase } from "./fieldParts";

export type ComboOption = { value: string; label: string; group?: string; keywords?: string[]; lang?: "en" | "hi" };

type Indexed = { option: ComboOption; index: number };
type Section = { key: string; label: string | null; items: Indexed[] };

const norm = (s: string) => s.toLowerCase().normalize("NFC");
const WORD_SPLIT = /[\s\-–—/(),.:;]+/;

/** exact prefix (3) > word start (2) > substring (1) > no match (0), over label + keywords. */
function score(option: ComboOption, q: string): number {
  let best = 0;
  for (const hay of [option.label, ...(option.keywords ?? [])]) {
    const s = norm(hay);
    if (s.startsWith(q)) return 3;
    if (!s.includes(q)) continue;
    best = Math.max(best, s.split(WORD_SPLIT).some((w) => w.startsWith(q)) ? 2 : 1);
  }
  return best;
}

function buildSections(
  options: ComboOption[],
  query: string,
  groupOrder: string[] | undefined,
  groupLabel: ((g: string) => string) | undefined
): { sections: Section[]; count: number } {
  const q = norm(query.trim());
  let ranked = options.map((option, i) => ({ option, i, s: q ? score(option, q) : 1 }));
  if (q) ranked = ranked.filter((r) => r.s > 0).sort((a, b) => b.s - a.s || a.i - b.i);

  const byGroup = new Map<string, ComboOption[]>();
  const seen: string[] = [];
  for (const { option } of ranked) {
    const g = option.group ?? "";
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      seen.push(g);
    }
    byGroup.get(g)!.push(option);
  }
  const order = groupOrder ?? [];
  const keys = [
    ...(byGroup.has("") ? [""] : []),
    ...order.filter((g) => g !== "" && byGroup.has(g)),
    ...seen.filter((g) => g !== "" && !order.includes(g)),
  ];

  let index = 0;
  const sections = keys.map((key) => ({
    key,
    label: key ? (groupLabel ? groupLabel(key) : key) : null,
    items: byGroup.get(key)!.map((option) => ({ option, index: index++ })),
  }));
  return { sections, count: index };
}

/**
 * ARIA 1.2 combobox with a grouped listbox. On focus it shows the full
 * grouped list, so it doubles as a picker; typing filters label + keywords.
 * ↑/↓ move aria-activedescendant across groups, Enter picks, Escape closes
 * and a second Escape clears. It closes on an outside pointerdown, never on a
 * blur timeout. Below 768px it scrolls itself to the top of the screen on
 * focus so the list has room above the keyboard.
 *
 * `footerOption` (e.g. "My treatment isn't in this list") is always last and
 * never filtered out.
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
  placeholder,
  footerOption,
}: FieldBase & {
  options: ComboOption[];
  groupOrder?: string[];
  groupLabel?: (g: string) => string;
  value: string | null;
  onChange: (v: string | null) => void;
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
  const [active, setActive] = useState(-1);
  // True while the active option was reached with the arrow keys: it then also
  // gets the inset focus ring, since bg-fill alone is too faint on bg-elevated.
  const [keyboardNav, setKeyboardNav] = useState(false);

  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;
  const optionId = (i: number) => `${id}-opt-${i}`;

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? (footerOption && footerOption.value === value ? footerOption.label : null);
  const inputValue = editing ? query : (selectedLabel ?? "");

  const filter = editing ? query : "";
  const { sections, count } = buildSections(options, filter, groupOrder, groupLabel);
  const flat: { value: string; label: string }[] = sections.flatMap((s) => s.items.map((it) => it.option));
  if (footerOption) flat.push(footerOption);
  const total = flat.length;
  const activeIndex = active >= 0 && active < total ? active : -1;

  // Close on a pointerdown anywhere outside the field and its list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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
  const trimmed = query.trim();
  useEffect(() => {
    if (!open || !editing || !trimmed) return;
    const timer = window.setTimeout(() => announce(t("search.count", { n: count })), 600);
    return () => window.clearTimeout(timer);
  }, [open, editing, trimmed, count, announce, t]);

  const selectedIndex = flat.findIndex((o) => o.value === value);

  function openList(initial: number) {
    setOpen(true);
    setActive(initial);
  }

  function pick(i: number) {
    const item = flat[i];
    if (!item) return;
    onChange(item.value);
    setEditing(false);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function clear(reopen: boolean) {
    if (value !== null) onChange(null);
    setEditing(false);
    setQuery("");
    setActive(-1);
    setOpen(reopen);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    setQuery(text);
    setEditing(true);
    setOpen(true);
    const matches = text.trim() ? buildSections(options, text, groupOrder, groupLabel).count : 0;
    setActive(matches > 0 ? 0 : -1);
    if (value !== null) onChange(null);
  }

  function onFocus() {
    setOpen(true);
    setActive(selectedIndex);
    if (window.matchMedia("(max-width: 47.99rem)").matches) {
      wrapRef.current?.scrollIntoView({ block: "start" });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") setKeyboardNav(true);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openList(e.altKey ? activeIndex : selectedIndex >= 0 ? selectedIndex : 0);
        else if (total > 0) setActive(activeIndex < 0 || activeIndex >= total - 1 ? 0 : activeIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openList(selectedIndex >= 0 ? selectedIndex : total - 1);
        else if (total > 0) setActive(activeIndex <= 0 ? total - 1 : activeIndex - 1);
        break;
      case "Enter":
        if (open) {
          // Never submit the surrounding form while the list is open.
          e.preventDefault();
          if (activeIndex >= 0) pick(activeIndex);
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
        setOpen(false);
        break;
    }
  }

  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Focus moved to another control outside the widget (not an option click,
    // which keeps focus in the input). No timeout involved.
    const next = e.relatedTarget as Node | null;
    if (next && wrapRef.current && !wrapRef.current.contains(next)) setOpen(false);
  }

  function renderOption(item: { value: string; label: string; lang?: "en" | "hi" }, index: number) {
    const isActive = index === activeIndex;
    return (
      <li
        key={`${index}-${item.value}`}
        id={optionId(index)}
        role="option"
        aria-selected={isActive}
        lang={item.lang}
        onClick={() => pick(index)}
        onPointerMove={() => {
          if (keyboardNav) setKeyboardNav(false);
          if (!isActive) setActive(index);
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
          aria-describedby={describedBy(id, hint, error)}
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
        <div
          hidden={!open}
          // Keep focus in the input when an option is pressed.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(50dvh,360px)] overflow-y-auto rounded-card bg-elevated py-2 shadow-pop"
        >
          {count === 0 && (
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
            {footerOption && renderOption(footerOption, count)}
          </ul>
        </div>
      </div>
      <FieldError id={id} message={error} />
    </div>
  );
}
