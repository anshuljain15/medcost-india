"use client";

import { useEffect, useRef, useState } from "react";
import { searchMedicines } from "@/lib/medicineShards";
import { readImageText } from "@/lib/ocr";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Callout, ChipRow, ChoiceChip, DataText, PhotoInput, PrivacyNote, ProgressBar, useAnnounce } from "@/components/ui";

// Reads a photo of a strip, bill or printed prescription in the browser
// (lib/ocr.ts -- the image is never uploaded).
//
// OCR output is never searched automatically: we keep only words that hit the
// search index and show them as chips for the person to pick. A misread word
// becomes a wrong suggestion they can ignore, not a wrong answer.

const MAX_CANDIDATES = 40;

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "reading"; pct: number }
  /** OCR is done; the readable words are being looked up in the index. */
  | { kind: "matching" }
  | { kind: "done"; words: string[] }
  | { kind: "failed" };

function candidates(text: string): string[] {
  const tokens = text.replace(/[^A-Za-z0-9\- ]+/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  tokens.forEach((tok, i) => {
    if (!/^[A-Za-z][A-Za-z-]{2,}$/.test(tok)) return;
    const next = tokens[i + 1];
    // "Pan 40": a name followed by its strength searches better than the name alone
    if (next && /^\d+(\.\d+)?$/.test(next)) out.add(`${tok} ${next}`);
    out.add(tok);
  });
  return [...out].slice(0, MAX_CANDIDATES);
}

/**
 * The photo controls under the medicine search field: tonal PhotoInput (no
 * `capture`, so Android offers Camera or Gallery), the privacy line right
 * beside it, OCR progress, then the readable words as toggle chips.
 * `selected` is the current query, so the chip it came from shows as pressed.
 *
 * `collapsed` (the person has typed a query) hides the block while no scan is
 * in progress or on screen, so the results start right under the field. The
 * component stays mounted either way: picking a word chip sets the query, and
 * unmounting then would throw away the chips and any OCR still running.
 */
export default function PrescriptionScan({
  onPick,
  selected,
  collapsed = false,
}: {
  onPick: (q: string) => void;
  selected?: string;
  collapsed?: boolean;
}) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [state, setState] = useState<State>({ kind: "idle" });
  const busy = state.kind === "loading" || state.kind === "reading" || state.kind === "matching";

  // The photo control is disabled while busy, and a disabled control drops
  // keyboard focus to <body>. When the scan ends, put focus back on it so the
  // person continues from the photo control (retry) or tabs on to the chips.
  const photoTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (busy) return;
    const el = photoTrigger.current;
    photoTrigger.current = null;
    if (el?.isConnected && (document.activeElement === null || document.activeElement === document.body)) el.focus();
  }, [busy]);

  async function handleFile(file: File) {
    const active = document.activeElement;
    photoTrigger.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setState({ kind: "loading" });
    try {
      const text = await readImageText(file, (pct) => setState({ kind: "reading", pct }));
      setState({ kind: "matching" });
      // All lookups at once: words that share a 3-letter shard share one fetch
      // (fetchStaticJson caches the promise), and the chips keep reading order.
      const list = candidates(text);
      const hits = await Promise.all(list.map((c) => searchMedicines(c, 1)));
      const words = list.filter((_, i) => hits[i].length > 0);
      setState({ kind: "done", words });
      announce(words.length > 0 ? t("medicines.scan.found") : t("medicines.scan.nothing"));
    } catch {
      setState({ kind: "failed" });
      announce(t("medicines.scan.failed"));
    }
  }

  if (collapsed && state.kind === "idle") return null;

  const pct = state.kind === "reading" ? state.pct : state.kind === "matching" ? 100 : 0;

  return (
    <div className="space-y-2">
      <PhotoInput label={t("medicines.scan.button")} variant="tonal" onFile={handleFile} disabled={busy} />
      <PrivacyNote>{t("medicines.scan.privacy")}</PrivacyNote>
      <p className="text-footnote text-label-2">{t("medicines.scan.handwriting")}</p>

      {busy && (
        <ProgressBar
          value={pct}
          label={t("medicines.scan.readingLabel")}
          text={
            state.kind === "loading"
              ? t("medicines.scan.loading")
              : state.kind === "matching"
                ? t("medicines.searching")
                : t("medicines.scan.reading", { pct: Math.floor(pct / 10) * 10 })
          }
          // Announced once per stage; the percentage is shown, not read out.
          stage={
            state.kind === "loading"
              ? t("medicines.scan.loading")
              : state.kind === "matching"
                ? t("medicines.searching")
                : t("medicines.scan.readingLabel")
          }
        />
      )}

      {state.kind === "failed" && <Callout>{t("medicines.scan.failed")}</Callout>}

      {state.kind === "done" &&
        (state.words.length === 0 ? (
          <Callout>{t("medicines.scan.nothing")}</Callout>
        ) : (
          <div className="space-y-2 pt-2">
            <p className="text-callout text-label">{t("medicines.scan.found")}</p>
            <ChipRow wrap label={t("medicines.scan.found")}>
              {state.words.map((w) => (
                <ChoiceChip key={w} type="toggle" checked={selected === w} onChange={() => onPick(w)}>
                  <DataText>{w}</DataText>
                </ChoiceChip>
              ))}
            </ChipRow>
          </div>
        ))}
    </div>
  );
}
