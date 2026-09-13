"use client";

import { useState } from "react";
import type { HospitalReviews as Reviews } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Review text, author names and photos are Google users' own content. We keep
// the author attribution and link every review back to its source rather than
// presenting it as ours, and photos are hotlinked — never copied into this repo.

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="text-brand-600" aria-hidden="true">
      {"★".repeat(Math.round(rating))}
      <span className="text-ink-300">{"★".repeat(5 - Math.round(rating))}</span>
    </span>
  );
}

function PhotoStrip({ photos }: { photos: string[] }) {
  // Google photo URLs expire. Drop any that 404 rather than showing a broken tile.
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const visible = photos.filter((_, i) => !broken.has(i));
  if (visible.length === 0) return null;

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {photos.map((src, i) =>
        broken.has(i) ? null : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            loading="lazy"
            className="h-24 w-32 shrink-0 rounded-lg border border-ink-100 object-cover"
            onError={() => setBroken((prev) => new Set(prev).add(i))}
          />
        )
      )}
    </div>
  );
}

export default function HospitalReviews({ reviews }: { reviews: Reviews }) {
  const { t } = useTranslation();
  const { rating, reviewCount, summary, topReviews, photos, googleMapsUrl, fetchedAt } =
    reviews;

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink-900">{t("reviews.heading")}</h2>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            {t("reviews.viewOnGoogle")}
          </a>
        )}
      </div>

      {rating !== null && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold text-ink-900">{rating.toFixed(1)}</span>
          <Stars rating={rating} />
          {reviewCount !== null && (
            <span className="text-sm text-ink-500">
              {t("reviews.countLabel", { n: reviewCount.toLocaleString("en-IN") })}
            </span>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-800">
            {t("reviews.summaryLabel")}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-700">{summary}</p>
          <p className="mt-2 text-xs text-ink-500">{t("reviews.summaryDisclaimer")}</p>
        </div>
      )}

      <PhotoStrip photos={photos} />

      {topReviews.length > 0 && (
        <ul className="mt-5 space-y-4">
          {topReviews.map((r, i) => (
            <li
              key={r.reviewUrl ?? `${r.author}-${i}`}
              className="rounded-xl border border-ink-100 bg-surface p-4"
            >
              <div className="flex items-center gap-3">
                {r.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.avatarUrl}
                    alt=""
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-500">
                    {r.author.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {r.profileUrl ? (
                    <a
                      href={r.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-ink-900 hover:underline"
                    >
                      {r.author}
                    </a>
                  ) : (
                    <div className="truncate text-sm font-medium text-ink-900">
                      {r.author}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <Stars rating={r.rating} />
                    {r.publishedAt && <span>{r.publishedAt}</span>}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-700">{r.text}</p>
              {r.reviewUrl && (
                <a
                  href={r.reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-brand-700 hover:underline"
                >
                  {t("reviews.viewReview")}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-500">
        {fetchedLabel
          ? t("reviews.sourceDated", { date: fetchedLabel })
          : t("reviews.source")}
      </p>
    </section>
  );
}
