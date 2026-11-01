import { cx } from "./href";

/**
 * Data table (/rates from 768px). Children are <tr> rows; build cells with
 * <TableCell> (numeric cells right-aligned and tabular). Row hairlines, hover
 * fill and cell padding come from the table, so plain <tr>/<td> look right.
 * No zebra stripes.
 */
export function Table({
  caption,
  columns,
  children,
}: {
  caption: string;
  columns: { key: string; label: string; numeric?: boolean }[];
  children: React.ReactNode;
}) {
  return (
    <table className="w-full text-callout [&_tbody_td]:px-3 [&_tbody_td]:py-3 [&_tbody_td]:align-top [&_tbody_tr]:border-b [&_tbody_tr]:border-hairline [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150 [&_tbody_tr:hover]:bg-fill">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={cx(
                "sticky top-14 bg-surface px-3 py-2 text-footnote font-semibold text-label-2",
                c.numeric ? "text-right" : "text-left"
              )}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

/** A body cell; `numeric` right-aligns with tabular figures. */
export function TableCell({ numeric, children }: { numeric?: boolean; children: React.ReactNode }) {
  return <td className={numeric ? "text-right tabular-nums" : "text-label"}>{children}</td>;
}
