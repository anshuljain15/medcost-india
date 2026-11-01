"use client";

import dynamic from "next/dynamic";
import { Callout } from "@/components/ui/Callout";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import type { MapHospital } from "./HospitalMap";

export type { MapHospital };

type Props = { hospitals: MapHospital[]; citySlug: string };

function MapLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" className="flex h-full w-full items-center justify-center bg-fill p-4 text-callout text-label-2">
      {t("city.mapLoading")}
    </div>
  );
}

/** The map chunk itself failed to download (offline, blocked): same fallback as a WebGL failure. */
function MapUnavailable() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface p-4">
      <div role="status" className="max-w-[40ch]">
        <Callout>{t("city.mapFailed")}</Callout>
      </div>
    </div>
  );
}

// MapLibre touches window and WebGL, so it is never server-rendered, and its
// large chunk loads only when the map is actually shown (CityView decides).
const HospitalMap = dynamic<Props>(
  () => import("./HospitalMap").catch(() => ({ default: MapUnavailable })),
  { ssr: false, loading: () => <MapLoading /> }
);

export default function HospitalMapLoader({ hospitals, citySlug }: Props) {
  return <HospitalMap hospitals={hospitals} citySlug={citySlug} />;
}
