"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { amountShort } from "@/lib/format";
import { Money } from "./Money";
import { cx } from "./href";
import { FieldError, FieldHint, FieldLabel, INPUT_CLASS, describedBy, type FieldBase } from "./fieldParts";

export type { FieldBase };

type InputRest = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "id" | "inputMode" | "children">;

/**
 * Label, optional hint, input, inline error. Hint and error are tied to the
 * input with aria-describedby; an error sets aria-invalid (2px danger border).
 */
export function TextField({
  id,
  label,
  hint,
  error,
  className,
  type = "text",
  "aria-describedby": extraDescribedBy,
  ...rest
}: FieldBase & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldHint id={id}>{hint}</FieldHint>
      <input
        {...rest}
        id={id}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error, extraDescribedBy)}
        className={cx(INPUT_CLASS, "px-4", className)}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

/**
 * Rupee amount. Digits only (the value passed back is the bare digit string),
 * a "₹" prefix, and a read-back under the field ("₹2,40,000 · ₹2.4 lakh") that
 * is tied by aria-describedby rather than announced live.
 */
export function MoneyField({
  id,
  label,
  hint,
  error,
  value,
  onValueChange,
  ...rest
}: FieldBase & { value: string; onValueChange: (digits: string) => void } & InputRest) {
  const { t } = useTranslation();
  const n = value ? Number(value) : NaN;
  const hasAmount = Number.isFinite(n) && n > 0;
  const short = hasAmount ? amountShort(n) : null;
  const readbackId = `${id}-readback`;
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
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error, hasAmount && readbackId)}
          className={cx(INPUT_CLASS, "pl-9 pr-4 tabular-nums")}
        />
      </div>
      {hasAmount && (
        <p id={readbackId} className="mt-2 text-callout text-label-2">
          <Money value={n} />
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
