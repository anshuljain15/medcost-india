import { ActionLink } from "./ActionLink";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

/**
 * A quiet "nothing here" block that always offers a next step when there is
 * one: `action` is a link ({href, label}) or, for a step that stays on the
 * page such as "Clear filters", a plain button ({onClick, label}).
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: React.ReactNode;
  action?: { href: string; label: string } | { onClick: () => void; label: string };
}) {
  return (
    <div className="rounded-card bg-surface p-6">
      <Icon name={icon} className="size-8 text-label-3" />
      <p className="mt-3 text-headline text-label">{title}</p>
      {body && <div className="mt-1 text-callout text-label-2">{body}</div>}
      {action && (
        <div className="mt-2">
          {"href" in action ? (
            <ActionLink href={action.href}>{action.label}</ActionLink>
          ) : (
            <Button variant="plain" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
