"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Shares a plain-text result plus a link to the checker. Uses the phone's
// share sheet when there is one (WhatsApp is how most of this gets passed
// on), the clipboard otherwise. Only the numbers the person typed are shared.
export default function ShareButton({ text, path, onDark = false }: { text: string; path: string; onDark?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function share() {
    const base = process.env.NEXT_PUBLIC_DEPLOY_TARGET === "static" ? "/medcost-india" : "";
    const url = `${window.location.origin}${base}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        // dismissed, or not allowed here: fall through to copying
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked; nothing useful left to try
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${
        onDark ? "border-brand-400 text-contrast-fg hover:bg-white/10" : "border-brand-200 text-brand-700 hover:bg-brand-50"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? t("check.copied") : t("check.share")}
    </button>
  );
}
