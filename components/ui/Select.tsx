import { Icon } from "./Icon";
import { cx } from "./href";
import { FieldError, FieldHint, FieldLabel, INPUT_CLASS, describedBy, type FieldBase } from "./fieldParts";

/** Native <select> with the TextField look and a chevron. Pass <option>s as children. */
export function Select({
  id,
  label,
  hint,
  error,
  className,
  children,
  "aria-describedby": extraDescribedBy,
  ...rest
}: FieldBase & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldHint id={id}>{hint}</FieldHint>
      <div className="relative">
        <select
          {...rest}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error, extraDescribedBy)}
          className={cx(INPUT_CLASS, "appearance-none pl-4 pr-11", className)}
        >
          {children}
        </select>
        <Icon
          name="chevron-down"
          className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-label-2"
        />
      </div>
      <FieldError id={id} message={error} />
    </div>
  );
}
