"use client";

import { ButtonLink } from "@/components/ui/Button";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { ListRow } from "@/components/ui/ListRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageShell } from "@/components/ui/PageShell";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { SECTIONS } from "@/lib/nav";

// 404 (§6). Client so it can use t(); the root layout renders the normal
// chrome around it, and the static export still emits 404.html.
//
// No search field of its own: the header search is on this page (a 404 path
// is never "/" or "/hospitals"), and a second, page-level one would only
// repeat it, without the server-read medicine source dates the header's has.
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <PageHeader title={t("notFound.title")} lead={t("notFound.body")} />
      <InsetGroup>
        <ListRow href="/" leading="home" title={t("nav.home")} />
        {SECTIONS.map((section) => (
          <ListRow key={section.key} href={section.href} leading={section.icon} title={t(section.navKey)} />
        ))}
      </InsetGroup>
      <div className="mt-8">
        <ButtonLink variant="plain" href="/">
          {t("notFound.home")}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
