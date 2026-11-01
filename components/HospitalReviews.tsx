"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HospitalReviews as Reviews } from "@/lib/types";
import { formatISODate } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { ActionLink } from "@/components/ui/ActionLink";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { DataText } from "@/components/ui/DataText";
import { Icon } from "@/components/ui/Icon";
import { ExtLink } from "@/components/ui/InlineLink";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cx } from "@/components/ui/href";

// Review text, author names and photos are Google users' own content, taken
// from a scraping vendor rather than the Places API (see CLAUDE.md and the
// docstring in data-pipeline/sources/google_reviews.py). Four things here are
// load-bearing and must not be dropped: the author attribution with a link to
// the profile, a link back to each review and to the place on Google Maps,
// photos hotlinked (never copied into this repo), and the visible fetch date.
// The summary is AI-written and always carries its label and disclaimer.
//
// This component receives ONE hospital's record as a prop from the server
// page; it must never import lib/reviews.ts.

/** "2026-10-30T08:12:00Z" -> "30 Oct 2026". A non-ISO value is shown as given; null stays null. */
function fetchedLabel(fetchedAt: string | null): string | null {
  if (!fetchedAt) return null;
  const iso = /^\d{4}-\d{2}(-\d{2})?/.exec(fetchedAt.trim());
  return iso ? formatISODate(iso[0]) : fetchedAt.trim();
}

/** Decorative only: the rating is always also given in words. */
function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon key={i} name="star" className={i < filled ? "size-4 fill-current text-label-2" : "size-4 text-label-3"} />
      ))}
    </span>
  );
}

function PhotoStrip({ photos }: { photos: string[] }) {
  // Google photo URLs expire. Drop any that fail rather than showing a broken tile.
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const visible = photos.filter((src) => !broken.has(src));
  if (visible.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {visible.map((src) => (
        // Hotlinked on purpose: these images are never copied or re-hosted.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-28 w-40 shrink-0 snap-start rounded-control bg-fill object-cover"
          onError={() => setBroken((prev) => new Set(prev).add(src))}
        />
      ))}
    </div>
  );
}

/** Review text clamped to 6 lines, with a toggle only when it actually overflows. */
function ClampedText({ text }: { text: string }) {
  const { t } = useTranslation();
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const ro = new ResizeObserver(() => setOverflows(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  return (
    <div>
      <p ref={ref} id={id} className={cx("whitespace-pre-line text-body text-label", !expanded && "line-clamp-6")}>
        {text}
      </p>
      {(overflows || expanded) && (
        <Button variant="plain" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("reviews.readLess") : t("reviews.readMore")}
        </Button>
      )}
    </div>
  );
}

export default function HospitalReviews({ reviews }: { reviews: Reviews }) {
  const { t } = useTranslation();
  const { rating, reviewCount, summary, topReviews, photos, googleMapsUrl, fetchedAt } = reviews;
  const fetched = fetchedLabel(fetchedAt);

  let ratingText: string | null = null;
  if (rating !== null && reviewCount !== null) {
    ratingText = t("hospital.ratingLine", { rating: rating.toFixed(1), n: reviewCount.toLocaleString("en-IN") });
  } else if (rating !== null) {
    ratingText = t("reviews.ratingOf", { rating: rating.toFixed(1) });
  } else if (reviewCount !== null) {
    ratingText = t("reviews.countLabel", { n: reviewCount.toLocaleString("en-IN") });
  }

  return (
    <section aria-labelledby="hospital-reviews" className="space-y-4">
      <SectionHeader id="hospital-reviews" title={t("reviews.heading")} />

      {(ratingText || googleMapsUrl) && (
        <div>
          {ratingText && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-headline tabular-nums text-label">
              <span>{ratingText}</span>
              {rating !== null && <Stars rating={rating} />}
            </p>
          )}
          {googleMapsUrl && (
            <ActionLink href={googleMapsUrl} external>
              {t("reviews.viewOnGoogle")}
            </ActionLink>
          )}
        </div>
      )}

      {summary && (
        <Callout title={t("reviews.summaryLabel")}>
          <p className="text-body">{summary}</p>
          <p className="text-footnote">{t("reviews.summaryDisclaimer")}</p>
        </Callout>
      )}

      <PhotoStrip photos={photos} />

      {topReviews.length > 0 && (
        <ul className="space-y-3">
          {topReviews.map((r, i) => (
            <li key={r.reviewUrl ?? `${r.author}-${i}`}>
              <Card as="article" className="space-y-2">
                <p className="text-headline text-label">
                  {r.profileUrl ? (
                    <ExtLink href={r.profileUrl}>
                      <DataText>{r.author}</DataText>
                    </ExtLink>
                  ) : (
                    <DataText>{r.author}</DataText>
                  )}
                </p>
                {(r.rating !== null || r.publishedAt) && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-callout text-label-2">
                    {r.rating !== null && (
                      <>
                        <Stars rating={r.rating} />
                        <span>{t("reviews.ratingOf", { rating: r.rating })}</span>
                      </>
                    )}
                    {r.rating !== null && r.publishedAt && <span aria-hidden="true">·</span>}
                    {r.publishedAt && <DataText>{r.publishedAt}</DataText>}
                  </p>
                )}
                {r.text && <ClampedText text={r.text} />}
                {r.reviewUrl && (
                  <ActionLink href={r.reviewUrl} external>
                    {t("reviews.viewReview")}
                  </ActionLink>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-footnote text-label-2">
        {fetched ? t("reviews.sourceDated", { date: fetched }) : t("reviews.source")}
      </p>
    </section>
  );
}
