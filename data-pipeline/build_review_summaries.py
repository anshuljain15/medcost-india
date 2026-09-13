"""
Writes a short, neutral summary of each hospital's scraped Google reviews back
into data/generated/reviews.json (the `summary` / `summaryModel` fields).

Uses the Message Batches API: a few hundred independent one-shot summaries is
exactly the non-latency-sensitive shape batching exists for, at half the cost.
For ~362 Bangalore hospitals this is roughly $2 one-time.

Re-runnable: entries that already carry a summary are skipped, so a failed or
partial run costs only the remainder.

Requires:  pip install anthropic   and   ANTHROPIC_API_KEY (or `ant auth login`)
Usage:     python data-pipeline/build_review_summaries.py [--limit N] [--force]
"""

import argparse
import json
import sys
import time
from pathlib import Path

from anthropic import Anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "generated"
REVIEWS = OUT_DIR / "reviews.json"

MODEL = "claude-opus-5"
POLL_SECONDS = 20

SYSTEM = """You summarise patient reviews of Indian hospitals for a price-transparency site.

Write 2-3 plain sentences describing what reviewers consistently report. Rules:
- Use ONLY what the reviews say. Never add clinical claims, prices, or facts not present.
- Cover both praise and complaints when both appear. Do not average them away into blandness.
- Report themes (waiting times, billing clarity, nursing care, cleanliness), not individual anecdotes.
- Never name a patient, doctor, or staff member, even if a review does.
- Neutral register. No marketing language, no recommendation, no star rating restated.
- If the reviews are too few or too contradictory to characterise, say exactly that in one sentence.
Return the summary text only, with no preamble."""


def build_prompt(entry: dict) -> str:
    lines = [f"Hospital reviews (rating {entry.get('rating')}, {entry.get('reviewCount')} total on Google):", ""]
    for r in entry["topReviews"]:
        lines.append(f"- [{r.get('rating')}/5] {r['text']}")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, help="only summarise the first N pending entries")
    ap.add_argument("--force", action="store_true", help="re-summarise entries that already have one")
    args = ap.parse_args()

    reviews = json.loads(REVIEWS.read_text(encoding="utf-8"))
    pending = [
        (slug, e)
        for slug, e in reviews.items()
        if e.get("topReviews") and (args.force or not e.get("summary"))
    ]
    if args.limit:
        pending = pending[: args.limit]

    if not pending:
        print("nothing to summarise -- every matched hospital already has a summary")
        return

    print(f"{len(pending)} hospitals to summarise via the Batches API")

    client = Anthropic()
    batch = client.messages.batches.create(
        requests=[
            Request(
                custom_id=slug,
                params=MessageCreateParamsNonStreaming(
                    model=MODEL,
                    max_tokens=400,
                    system=SYSTEM,
                    output_config={"effort": "low"},
                    messages=[{"role": "user", "content": build_prompt(entry)}],
                ),
            )
            for slug, entry in pending
        ]
    )
    print(f"batch {batch.id} submitted")

    while True:
        status = client.messages.batches.retrieve(batch.id)
        if status.processing_status == "ended":
            break
        counts = status.request_counts
        print(f"  {status.processing_status}: {counts.succeeded} ok, {counts.errored} errored, {counts.processing} running")
        time.sleep(POLL_SECONDS)

    ok = errored = refused = 0
    # Results come back in ANY order -- key by custom_id, never by position.
    for result in client.messages.batches.results(batch.id):
        slug = result.custom_id
        if result.result.type != "succeeded":
            errored += 1
            print(f"  {slug}: {result.result.type}")
            continue
        message = result.result.message
        if message.stop_reason == "refusal":
            refused += 1
            continue
        text = "".join(b.text for b in message.content if b.type == "text").strip()
        if not text:
            errored += 1
            continue
        reviews[slug]["summary"] = text
        reviews[slug]["summaryModel"] = MODEL
        ok += 1

    REVIEWS.write_text(json.dumps(reviews, ensure_ascii=False), encoding="utf-8")
    print(f"\n{ok} summaries written -> {REVIEWS}")
    if errored or refused:
        print(f"  {errored} errored, {refused} refused (re-run to retry those)")
        sys.exit(1 if errored else 0)


if __name__ == "__main__":
    main()
