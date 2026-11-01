import { Icon } from "./Icon";

/**
 * A radio group drawn as a segmented track. Native radios give arrow-key
 * movement and form semantics for free; the segment shows the focus ring of
 * its radio. The selected segment is never shown by colour alone: it gets a
 * check icon, semibold text and a 3:1 edge (ring-control) on its thumb, since
 * thumb against track is only 1.2:1 (light) / 2.1:1 (dark).
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
              className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-thumb px-3 text-center text-callout font-medium text-label transition-[background-color,box-shadow] duration-150 ease-fade peer-checked:bg-thumb peer-checked:font-semibold peer-checked:shadow-thumb peer-checked:ring-1 peer-checked:ring-control peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
            >
              {value === o.value && <Icon name="check" className="size-4 shrink-0" />}
              <span>{o.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
