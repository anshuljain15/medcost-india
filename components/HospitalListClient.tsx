"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Hospital } from "@/lib/types";

type Props = {
  hospitals: Hospital[];
  citySlug: string;
};

export default function HospitalListClient({ hospitals, citySlug }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.address ?? "").toLowerCase().includes(q)
    );
  }, [hospitals, query]);

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-ink-100 bg-white">
      <div className="border-b border-ink-100 p-3">
        <input
          type="text"
          placeholder="Search by hospital name or area..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <p className="mt-1 text-xs text-ink-500">
          {filtered.length} of {hospitals.length} shown
        </p>
      </div>
      <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
        {filtered.map((h) => (
          <li key={h.id}>
            <Link
              href={`/hospitals/${citySlug}/${h.slug}`}
              className="block px-4 py-3 hover:bg-brand-50"
            >
              <div className="text-sm font-medium text-ink-900">{h.name}</div>
              <div className="text-xs text-ink-500">{h.address}</div>
              <div className="mt-1 flex gap-2 text-xs">
                {h.networkType && (
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">
                    {h.networkType}
                  </span>
                )}
                {h.bedCount && <span className="text-ink-500">{h.bedCount} beds</span>}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-ink-500">No hospitals match.</li>
        )}
      </ul>
    </div>
  );
}
