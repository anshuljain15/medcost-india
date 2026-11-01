import { BackLink } from "./BackLink";

/** BackLink, H1, lead, meta and an optional slot (badges, actions). */
export function PageHeader({
  back,
  title,
  lead,
  meta,
  children,
  display,
}: {
  back?: { href: string; label: string };
  title: React.ReactNode;
  lead?: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  display?: boolean;
}) {
  return (
    <div className="mb-8 md:mb-10">
      {back && <BackLink href={back.href} label={back.label} />}
      <h1 className={display ? "text-display text-label text-balance" : "text-title1 text-label text-balance"}>
        {title}
      </h1>
      {lead && <p className="mt-3 max-w-[60ch] text-lead text-label-2">{lead}</p>}
      {meta && <p className="mt-2 text-callout text-label-2">{meta}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
