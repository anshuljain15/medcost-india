"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * "There is a problem" box at the top of a form step. The page focuses the
 * heading (via `titleRef`) on submit. Each message links to its field; the
 * link moves focus into the field rather than only scrolling to it.
 * Renders nothing when there are no errors.
 */
export function ErrorSummary({
  errors,
  titleRef,
}: {
  errors: { fieldId: string; message: string }[];
  titleRef?: React.Ref<HTMLHeadingElement>;
}) {
  const { t } = useTranslation();
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-card bg-danger-bg p-4 text-danger-fg">
      <h2 ref={titleRef} tabIndex={-1} className="text-headline focus:outline-none">
        {t("share.errorSummary")}
      </h2>
      <ul className="mt-2 text-callout">
        {errors.map((e) => (
          <li key={e.fieldId}>
            <a
              href={`#${e.fieldId}`}
              onClick={(ev) => {
                const field = document.getElementById(e.fieldId);
                if (!field) return;
                ev.preventDefault();
                field.focus();
                field.scrollIntoView({ block: "center" });
              }}
              className="inline-flex min-h-11 items-center text-danger-fg underline decoration-1 underline-offset-2"
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
