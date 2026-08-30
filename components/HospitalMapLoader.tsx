"use client";

import dynamic from "next/dynamic";
import type { Hospital } from "@/lib/types";

const HospitalMap = dynamic(() => import("./HospitalMap"), { ssr: false });

export default function HospitalMapLoader({ hospitals }: { hospitals: Hospital[] }) {
  return <HospitalMap hospitals={hospitals} />;
}
