"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAnnounce } from "@/components/ui/LiveRegion";
import { BASE_PATH } from "@/lib/basePath";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Shares a plain-text result plus a link to the checker. Uses the phone's
// share sheet when there is one (WhatsApp is how most of this gets passed
// on), the clipboard otherwise. Only the numbers the person typed are shared.
export default function ShareButton({
  text,
  path,
  variant = "tonal",
}: {
  text: string;
  path: string;
  variant?: "primary" | "tonal" | "plain";
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${BASE_PATH}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch (err) {
        // The person closed the share sheet: nothing was shared, so copy
        // nothing and say nothing. Any other failure (not allowed here, no
        // share target) falls through to the clipboard.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      announce(t("check.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked; nothing useful left to try
    }
  }

  return (
    <Button variant={variant} icon={copied ? "check" : "share"} onClick={share}>
      {copied ? t("check.copied") : t("check.share")}
    </Button>
  );
}
