import { ActionLink } from "./ActionLink";
import { Icon, type IconName } from "./Icon";

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-card bg-surface p-6">
      <Icon name={icon} className="size-8 text-label-3" />
      <p className="mt-3 text-headline text-label">{title}</p>
      {body && <div className="mt-1 text-callout text-label-2">{body}</div>}
      {action && (
        <div className="mt-2">
          <ActionLink href={action.href}>{action.label}</ActionLink>
        </div>
      )}
    </div>
  );
}
