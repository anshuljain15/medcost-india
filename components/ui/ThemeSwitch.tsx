"use client";

import { useId } from "react";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useTheme, type Mode } from "@/lib/theme/ThemeProvider";
import { SegmentedControl } from "./SegmentedControl";

/** Footer appearance control: Auto (follows the device) / Light / Dark. */
export function ThemeSwitch() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const name = `theme-${useId()}`;
  return (
    <SegmentedControl<Mode>
      name={name}
      legend={t("footer.appearance")}
      options={[
        { value: "system", label: t("theme.system") },
        { value: "light", label: t("theme.light") },
        { value: "dark", label: t("theme.dark") },
      ]}
      value={mode}
      onChange={(m) => setMode(m)}
    />
  );
}
