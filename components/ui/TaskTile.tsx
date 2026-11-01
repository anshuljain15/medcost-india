import Link from "next/link";
import { Icon, type IconName } from "./Icon";

/**
 * One tool per tile. The tile holds exactly one link (stretched over the card
 * with ::after) and is never wrapped in <a>; the card draws the focus ring.
 * `level` defaults to 2; pass 3 when the tiles sit under a SectionHeader.
 */
export function TaskTile({
  href,
  icon,
  title,
  body,
  note,
  level = 2,
}: {
  href: string;
  icon: IconName;
  title: string;
  body: string;
  note?: React.ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 3 ? "h3" : "h2";
  return (
    <div className="group relative flex items-center gap-4 rounded-card bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-250 ease-standard hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <Icon name={icon} className="size-6" />
      </span>
      <div className="min-w-0">
        <Heading className="text-headline text-label">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">
            {title}
          </Link>
        </Heading>
        <p className="mt-0.5 text-callout text-label-2">{body}</p>
        {note && <div className="mt-2">{note}</div>}
      </div>
      <Icon name="chevron-right" className="ml-auto size-5 shrink-0 text-label-3" />
    </div>
  );
}
