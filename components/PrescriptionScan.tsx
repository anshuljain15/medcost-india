"use client";

import { useState } from "react";
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
 */
export default function PrescriptionScan({ onPick, selected }: { onPick: (q: string) => void; selected?: string }) {
  const { t } = useTranslation();
  const announce = useAnnounce();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleFile(file: File) {
    setState({ kind: "loading" });
    try {
      const text = await readImageText(file, (pct) => setState({ kind: "reading", pct }));
      const words: string[] = [];
      for (const c of candidates(text)) {
        const hits = await searchMedicines(c, 1);
        if (hits.length > 0) words.push(c);
      }
      setState({ kind: "done", words });
      announce(words.length > 0 ? t("medicines.scan.found") : t("medicines.scan.nothing"));
    } catch {
      setState({ kind: "failed" });
      announce(t("medicines.scan.failed"));
    }
  }

  const busy = state.kind === "loading" || state.kind === "reading";
  const pct = state.kind === "reading" ? state.pct : 0;

  return (
    <div className="space-y-2">
      <PhotoInput label={t("medicines.scan.button")} variant="tonal" onFile={handleFile} disabled={busy} />
      <PrivacyNote>{t("medicines.scan.privacy")}</PrivacyNote>
      <p className="text-footnote text-label-2">{t("medicines.scan.handwriting")}</p>

      {busy && (
        <ProgressBar
          value={pct}
          label={t("medicines.scan.button")}
          // Whole tens, so a screen reader hears a few updates rather than every percent.
          liveText={
            state.kind === "loading"
              ? t("medicines.scan.loading")
              : t("medicines.scan.reading", { pct: Math.floor(pct / 10) * 10 })
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
