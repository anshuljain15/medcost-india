import Link from "next/link";
import { Icon, type IconName } from "./Icon";
import { NewTabNote } from "./NewTabNote";
import { cx, isRoutable } from "./href";

type Variant = "primary" | "tonal" | "plain";
type Size = "md" | "lg";

export type ButtonBase = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: IconName;
  children: React.ReactNode;
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full text-headline transition-colors duration-150 ease-fade disabled:cursor-not-allowed";

// Height + padding per size. `lg` replaces the md pair instead of stacking on it,
// so two utilities never compete for the same property.
const SIZE: Record<Exclude<Variant, "plain">, Record<Size, string>> = {
  primary: { md: "min-h-12 px-6", lg: "min-h-14 px-7" },
  tonal: { md: "min-h-12 px-5", lg: "min-h-14 px-7" },
};

const TONE: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-fill disabled:text-label-3",
  tonal: "bg-accent-soft text-accent-strong hover:bg-accent-soft-hover disabled:bg-fill disabled:text-label-3",
  plain: "-mx-1 min-h-11 px-1 text-accent underline-offset-4 hover:underline disabled:text-label-3",
};

// The disabled look for elements that can't match :disabled (a <label>).
const TONE_DISABLED: Record<Variant, string> = {
  primary: "cursor-not-allowed bg-fill text-label-3",
  tonal: "cursor-not-allowed bg-fill text-label-3",
  plain: "-mx-1 min-h-11 px-1 cursor-not-allowed text-label-3",
};

/**
 * The button recipe as a class string. Exported for elements that must look
 * like a button without being one (PhotoInput's <label>); `disabled` swaps in
 * the disabled colours for those, since a label never matches :disabled.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  block,
  disabled,
}: {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  disabled?: boolean;
} = {}): string {
  return cx(
    BASE,
    variant !== "plain" && SIZE[variant][size],
    disabled ? TONE_DISABLED[variant] : TONE[variant],
    block && "w-full md:w-auto"
  );
}

/** Primary is one per screen. `type` defaults to "button"; pass type="submit" inside a form. */
export function Button({
  variant,
  size,
  block,
  icon,
  children,
  className,
  type = "button",
  ...rest
}: ButtonBase & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx(buttonClass({ variant, size, block }), className)} {...rest}>
      {icon && <Icon name={icon} className="size-5 shrink-0" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  icon,
  children,
  href,
  external,
}: ButtonBase & { href: string; external?: boolean }) {
  const className = buttonClass({ variant, size, block });
  const iconEl = icon && <Icon name={icon} className="size-5 shrink-0" />;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {iconEl}
        {children}
        <NewTabNote />
      </a>
    );
  }
  if (isRoutable(href)) {
    return (
      <Link href={href} className={className}>
        {iconEl}
        {children}
      </Link>
    );
  }
  // tel:, mailto: and same-tab absolute URLs
  return (
    <a href={href} className={className}>
      {iconEl}
      {children}
    </a>
  );
}
