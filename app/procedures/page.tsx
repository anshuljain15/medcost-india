"use client";

import { getAllProcedures } from "@/lib/data";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ProcedureGrid from "@/components/ProcedureGrid";

export default function ProceduresPage() {
  const { t } = useTranslation();
  const procedures = getAllProcedures();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-bold text-ink-900">{t("procedures.title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-700">{t("procedures.subtitle", { n: procedures.length })}</p>
      <ProcedureGrid procedures={procedures} />
    </div>
  );
}
