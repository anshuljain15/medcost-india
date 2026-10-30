"use client";

import { useRef, useState } from "react";
import { searchMedicines } from "@/lib/medicineShards";
import { useTranslation } from "@/lib/i18n/LanguageProvider";

// Reads a photo of a strip, bill or printed prescription IN THE BROWSER with
// tesseract.js. The image is never uploaded, so this needs no server and works
// the same on GitHub Pages and Vercel. Only the OCR engine and its English
// model are downloaded (from the jsDelivr CDN, tesseract.js's default).
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

export default function PrescriptionScan({ onPick }: { onPick: (q: string) => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState({ kind: "loading" });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setState({ kind: "reading", pct: Math.round(m.progress * 100) });
        },
      });
      const {
        data: { text },
      } = await worker.recognize(file);
      await worker.terminate();

      const words: string[] = [];
      for (const c of candidates(text)) {
        const hits = await searchMedicines(c, 1);
        if (hits.length > 0) words.push(c);
      }
      setState({ kind: "done", words });
    } catch {
      setState({ kind: "failed" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = state.kind === "loading" || state.kind === "reading";

  return (
    <div className="mt-6 rounded-xl border border-ink-100 bg-ink-50 p-4">
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-brand-700 shadow-sm ${busy ? "pointer-events-none opacity-60" : "hover:bg-brand-50"}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
          <path d="M3 7h3l2-3h8l2 3h3v13H3z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {t("medicines.scan.button")}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      <p className="mt-2 text-xs text-ink-500">
        {t("medicines.scan.privacy")} {t("medicines.scan.handwriting")}
      </p>

      {state.kind === "loading" && <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.loading")}</p>}
      {state.kind === "reading" && (
        <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.reading", { pct: state.pct })}</p>
      )}
      {state.kind === "failed" && <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.failed")}</p>}
      {state.kind === "done" &&
        (state.words.length === 0 ? (
          <p className="mt-3 text-sm text-ink-700">{t("medicines.scan.nothing")}</p>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-ink-700">{t("medicines.scan.found")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.words.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onPick(w)}
                  className="rounded-full border border-brand-200 bg-surface px-3 py-1 text-sm text-brand-800 hover:bg-brand-50"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
