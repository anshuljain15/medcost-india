import { ActionLink } from "./ActionLink";

export function SectionHeader({
  id,
  title,
  as = "h2",
  action,
}: {
  id?: string;
  title: string;
  as?: "h2" | "h3";
  action?: { href: string; label: string };
}) {
  const Heading = as;
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 md:mb-4">
      <Heading id={id} className={as === "h3" ? "text-title3 text-label" : "text-title2 text-label"}>
        {title}
      </Heading>
      {action && <ActionLink href={action.href}>{action.label}</ActionLink>}
    </div>
  );
}
