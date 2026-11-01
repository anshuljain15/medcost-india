"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAnnounce } from "@/components/ui/LiveRegion";
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
