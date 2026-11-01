/**
 * White inset list on the grey canvas. Children are <ListRow>s (each an <li>).
 * Static groups get no shadow and no border. Pass `headingId` to name the
 * section by its heading.
 */
export function InsetGroup({
  heading,
  headingId,
  footer,
  children,
}: {
  heading?: string;
  headingId?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={heading && headingId ? headingId : undefined}>
      {heading && (
        <h2 id={headingId} className="px-4 pb-2 text-footnote font-semibold text-label-2">
          {heading}
        </h2>
      )}
      <ul className="overflow-hidden rounded-card bg-surface">{children}</ul>
      {footer && <div className="px-4 pt-2 text-footnote text-label-2">{footer}</div>}
    </section>
  );
}
