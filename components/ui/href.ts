/**
 * In-app paths ("/procedures", "#hospitals", "?pin=560034") go through
 * next/link so the static basePath is added. Anything else (https:, tel:,
 * mailto:) is a plain <a>.
 */
export function isRoutable(href: string): boolean {
  return (href.startsWith("/") && !href.startsWith("//")) || href.startsWith("#") || href.startsWith("?");
}

/** Joins class lists, skipping empty parts. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
