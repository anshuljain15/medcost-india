"use client";

import UniversalSearch from "@/components/search/UniversalSearch";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

/**
 * Header search (§2.7): a native <dialog> (Sheet `full`), full screen below
 * 768px and a 640px panel 96px from the top from 768px. SiteHeader loads this
 * file with next/dynamic on first open. The search mounts only while open, so
 * every opening starts empty and focused.
 */
export default function SearchSheet({
  open,
  onClose,
  medicinesDate,
}: {
  open: boolean;
  onClose: () => void;
  medicinesDate?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onClose={onClose} label={t("nav.search")} full>
      {open && <UniversalSearch variant="sheet" autoFocus onNavigate={onClose} medicinesDate={medicinesDate} />}
    </Sheet>
  );
}
