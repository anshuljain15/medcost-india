"use client";

import { useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { amountShort } from "@/lib/format";
import { IconButton } from "./IconButton";
import { Money } from "./Money";
import { cx } from "./href";
import { FieldError, FieldHint, FieldLabel, INPUT_CLASS, describedBy, type FieldBase } from "./fieldParts";

export type { FieldBase };

type InputRest = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "id" | "inputMode" | "children">;

/** Below 768px (the phone layout with an on-screen keyboard). */
const PHONE_QUERY = "(max-width: 47.99rem)";

/**
 * Label, optional hint, input, inline error. Hint and error are tied to the
 * input with aria-describedby; an error sets aria-invalid (2px danger border).
 *
 * type="search" with a non-empty `value` gets a 44px clear button (the
 * browser's own ~18px one is hidden by INPUT_CLASS). It calls `onClear`, or
 * else fires the field's own onChange with "" (so whatever the page does on
 * typing also runs), and puts focus back in the field.
 *
 * `phoneSearch` (the page's main live filter: /procedures, /rates,
 * /medicines, a city's hospitals): below 768px, focusing the field scrolls
 * the field and its label to the top of the screen (scroll-padding-top clears
 * the header), so results fill the space above the keyboard; the keyboard's
 * Search/Enter key closes the keyboard. Both run before the caller's own
 * onFocus / onKeyDown, which still fire.
 */
export function TextField({
  id,
  label,
  hint,
  error,
  className,
  type = "text",
  onClear,
  phoneSearch,
  onFocus,
  onKeyDown,
  "aria-describedby": extraDescribedBy,
  ...rest
}: FieldBase & React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void; phoneSearch?: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const onPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
  const clearable = type === "search" && typeof rest.value === "string" && rest.value !== "" && !rest.disabled;

  function clearField() {
    const input = inputRef.current;
    if (onClear) onClear();
    else if (input) {
      // React tracks the value through the prototype setter, so this reaches
      // the field's onChange exactly like typing would.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    input?.focus();
  }

  return (
    <div ref={wrapRef}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldHint id={id}>{hint}</FieldHint>
      <div className="relative">
        <input
          {...rest}
          ref={inputRef}
          id={id}
          type={type}
          onFocus={(e) => {
            if (phoneSearch && onPhone()) wrapRef.current?.scrollIntoView({ block: "start" });
            onFocus?.(e);
          }}
          onKeyDown={(e) => {
            if (phoneSearch && e.key === "Enter" && onPhone()) e.currentTarget.blur();
            onKeyDown?.(e);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error, extraDescribedBy)}
          className={cx(INPUT_CLASS, "pl-4", clearable ? "pr-11" : "pr-4", className)}
        />
        {clearable && (
          <IconButton
            icon="x"
            label={t("search.clear")}
            onClick={clearField}
            className="absolute right-0 top-1/2 -translate-y-1/2"
          />
        )}
      </div>
      <FieldError id={id} message={error} />
    </div>
  );
}

/** "1,50,000.50" -> whole "150000", fraction ".50" (at most 2 digits; "" when no point was typed). */
function splitAmount(raw: string): { whole: string; fraction: string } {
  const dot = raw.indexOf(".");
  const whole = (dot < 0 ? raw : raw.slice(0, dot)).replace(/\D/g, "");
  const fraction = dot < 0 ? "" : `.${raw.slice(dot + 1).replace(/\D/g, "").slice(0, 2)}`;
  return { whole, fraction };
}

/**
 * Rupee amount with a "₹" prefix and a read-back under the field ("₹2,40,000 ·
 * ₹2.4 lakh") that is tied by aria-describedby rather than announced live.
 *
 * Whole rupees by default: the value passed back is the bare digit string.
 * Separators and "₹" are dropped, and paise are never glued onto the rupees:
 * "1,50,000.50", typed or pasted, gives "150000", not "15000050". The typed
 * ".50" stays visible while editing and the read-back confirms ₹1,50,000.
 * `decimal` keeps up to 2 decimals in the value ("1234.5"), for amounts that
 * carry paise (a pharmacy bill line).
 */
export function MoneyField({
  id,
  label,
  hint,
  error,
  value,
  onValueChange,
  decimal,
  ...rest
}: FieldBase & { value: string; onValueChange: (digits: string) => void; decimal?: boolean } & InputRest) {
  const { t } = useTranslation();
  // Whole-rupee mode: the ".50" typed after `forValue`. Shown, never passed back.
  const [typed, setTyped] = useState({ forValue: "", fraction: "" });
  const display = decimal || value === "" || typed.forValue !== value ? value : `${value}${typed.fraction}`;
  const n = value ? Number(value) : NaN;
  const hasAmount = Number.isFinite(n) && n > 0;
  const short = hasAmount ? amountShort(n) : null;
  const readbackId = `${id}-readback`;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { whole, fraction } = splitAmount(e.target.value);
    if (decimal) {
      onValueChange(fraction ? `${whole || "0"}${fraction}` : whole);
      return;
    }
    setTyped({ forValue: whole, fraction });
    onValueChange(whole);
  }

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldHint id={id}>{hint}</FieldHint>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-label-2"
        >
          ₹
        </span>
        <input
          {...rest}
          id={id}
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          autoComplete="off"
          value={display}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error, hasAmount && readbackId)}
          className={cx(INPUT_CLASS, "pl-9 pr-4 tabular-nums")}
        />
      </div>
      {hasAmount && (
        <p id={readbackId} className="mt-2 text-callout text-label-2">
          <Money value={n} perUnit={Boolean(decimal) && !Number.isInteger(n)} />
          {short && ` · ${t(short.unit === "crore" ? "common.croreOne" : "common.lakhOne", { n: short.value })}`}
        </p>
      )}
      <FieldError id={id} message={error} />
    </div>
  );
}

/** 6-digit Indian PIN code: numeric keypad, digits only, postal-code autofill. */
export function PinField({
  value,
  onValueChange,
  ...field
}: FieldBase & { value: string; onValueChange: (pin: string) => void } & InputRest) {
  return (
    <TextField
      {...field}
      type="text"
      inputMode="numeric"
      maxLength={6}
      autoComplete="postal-code"
      pattern="[1-9][0-9]{5}"
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="tabular-nums"
    />
  );
}
