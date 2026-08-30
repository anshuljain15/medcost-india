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
    <div className="flex h-[520px] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <input
          type="text"
          placeholder="Search by hospital name or area..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {filtered.length} of {hospitals.length} shown
        </p>
      </div>
      <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
        {filtered.map((h) => (
          <li key={h.id}>
            <Link
              href={`/hospitals/${citySlug}/${h.slug}`}
              className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{h.name}</div>
              <div className="text-xs text-zinc-500">{h.address}</div>
              <div className="mt-1 flex gap-2 text-xs">
                {h.networkType && (
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {h.networkType}
                  </span>
                )}
                {h.bedCount && <span className="text-zinc-400">{h.bedCount} beds</span>}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">No hospitals match.</li>
        )}
      </ul>
    </div>
  );
}
