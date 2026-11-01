"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** How a link warms its destination: Next's default (in view), on intent, or never. */
export type PrefetchMode = boolean | "intent";

/**
 * A next/link that prefetches on intent (pointer over, touch start, keyboard
 * focus) instead of when it scrolls into view. For long lists of links to
 * heavy routes (the six city pages carry their whole hospital list): a
 * scrolled list costs nothing, and a tapped row still starts loading
 * 100-300 ms before the click lands. Same idea as the search indexes, which
 * are prefetched on pointerenter or focus, never on page load (§2.7).
 */
export function IntentLink({
  href,
  onPointerEnter,
  onTouchStart,
  onFocus,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string }) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onPointerEnter={(e) => {
        warm();
        onPointerEnter?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        warm();
        onFocus?.(e);
      }}
    />
  );
}
