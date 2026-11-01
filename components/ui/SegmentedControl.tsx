/**
 * A radio group drawn as a segmented track. Native radios give arrow-key
 * movement and form semantics for free; the selected look comes only from
 * :checked plus tokens, and the segment shows the focus ring of its radio.
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  legendHidden,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  legendHidden?: boolean;
  options: { value: T; label: string; lang?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={legendHidden ? "sr-only" : "mb-2 text-headline text-label"}>{legend}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-control bg-fill p-0.5">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              lang={o.lang}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-thumb px-3 text-center text-callout font-medium text-label transition-[background-color,box-shadow] duration-150 ease-fade peer-checked:bg-thumb peer-checked:font-semibold peer-checked:shadow-thumb peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
