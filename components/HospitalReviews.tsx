"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { HospitalReview, HospitalReviews as Reviews } from "@/lib/types";
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
//
// The UI also guards those elements, so a bad reviews.json can't publish
// review text without them: a review with no link back or no author is not
// shown, and with no link to the place at all the section is not shown.

type LinkedReview = HospitalReview & { reviewUrl: string };

function isLinked(r: HospitalReview): r is LinkedReview {
  return Boolean(r.reviewUrl) && r.author.trim() !== "";
}

/**
 * "2026-10-30T08:12:00Z" -> "30 Oct 2026". Anything not ISO is null: the
 * vendor's "10/04/2026" is month-first (read here as 10 April), and "2 months
 * ago" goes stale in a static snapshot.
 */
function isoDateLabel(value: string | null): string | null {
  const iso = value ? /^\d{4}-\d{2}-\d{2}/.exec(value.trim()) : null;
  return iso ? formatISODate(iso[0]) : null;
}

/** The place on Google Maps: the stored link, or one built from the place id. */
function placeLink(reviews: Reviews, hospitalName: string): string | null {
  if (reviews.googleMapsUrl) return reviews.googleMapsUrl;
  if (!reviews.placeId) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospitalName)}&query_place_id=${encodeURIComponent(reviews.placeId)}`;
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

/** One review: author (linked to the profile when known), rating, date, text and its link back. */
function ReviewCard({ review: r }: { review: LinkedReview }) {
  const { t } = useTranslation();
  const published = isoDateLabel(r.publishedAt);
  return (
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
      {(r.rating !== null || published) && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-callout text-label-2">
          {r.rating !== null && (
            <>
              <Stars rating={r.rating} />
              <span>{t("reviews.ratingOf", { rating: r.rating })}</span>
            </>
          )}
          {r.rating !== null && published && <span aria-hidden="true">·</span>}
          {published && <span className="tabular-nums">{published}</span>}
        </p>
      )}
      {r.text && <ClampedText text={r.text} />}
      <ActionLink href={r.reviewUrl} external>
        {t("reviews.viewReview")}
      </ActionLink>
    </Card>
  );
}

export default function HospitalReviews({ reviews, hospitalName }: { reviews: Reviews; hospitalName: string }) {
  const { t } = useTranslation();
  const placeHref = placeLink(reviews, hospitalName);
  // Nothing here could be traced back to Google: show nothing rather than an unsourced rating.
  if (!placeHref) return null;

  const { rating, reviewCount, summary, photos } = reviews;
  const linkedReviews = reviews.topReviews.filter(isLinked);
  const fetched = isoDateLabel(reviews.fetchedAt);

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

      <div>
        {ratingText && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-headline tabular-nums text-label">
            <span>{ratingText}</span>
            {rating !== null && <Stars rating={rating} />}
          </p>
        )}
        <ActionLink href={placeHref} external>
          {t("reviews.viewOnGoogle")}
        </ActionLink>
      </div>

      {/* Its disclaimer points to "the reviews below", so it needs some to point to. */}
      {summary && linkedReviews.length > 0 && (
        <Callout title={t("reviews.summaryLabel")}>
          <p className="text-body">{summary}</p>
          <p className="text-footnote">{t("reviews.summaryDisclaimer")}</p>
        </Callout>
      )}

      <PhotoStrip photos={photos} />

      {linkedReviews.length > 0 && (
        <ul className="space-y-3">
          {linkedReviews.map((r) => (
            <li key={r.reviewUrl}>
              <ReviewCard review={r} />
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
