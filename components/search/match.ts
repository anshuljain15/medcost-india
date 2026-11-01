// Text matching for universal search (docs/design-system.md §2.7). Pure
// functions, no React. Both sides are normalised with
// toLowerCase().normalize("NFC"), so Devanagari is kept as typed.
//
// Ranking: exact prefix (3) > word start (2) > substring (1) > no match (0).
// A multi-word query whose every word starts some word of the text also
// counts as a substring match (1), so "replacement knee" still finds
// "Knee Replacement Surgery".

/** A six-digit Indian PIN code (never starts with 0). */
export const PIN_RE = /^[1-9]\d{5}$/;

export const SCORE_PREFIX = 3;
export const SCORE_WORD = 2;
export const SCORE_SUBSTRING = 1;

// Word separators, including the Devanagari danda.
const SEPARATORS = /[\s\-–—/\\(),.:;&'"‘’“”+_|।]+/g;

export function norm(text: string): string {
  return text.toLowerCase().normalize("NFC");
}

/** A haystack prepared once per index row. `spaced` is " word word " for word-start checks. */
export type Prepared = { text: string; spaced: string };

export function prepare(text: string): Prepared {
  const n = norm(text).trim();
  return { text: n, spaced: ` ${n.replace(SEPARATORS, " ").trim()} ` };
}

/** A prepared query; null when it is empty after trimming. */
export type Query = { text: string; words: string; tokens: string[] };

export function prepareQuery(raw: string): Query | null {
  const text = norm(raw).trim();
  if (!text) return null;
  const words = text.replace(SEPARATORS, " ").trim();
  return { text, words, tokens: words ? words.split(" ") : [] };
}

export function scoreOne(hay: Prepared, q: Query): number {
  if (hay.text.startsWith(q.text)) return SCORE_PREFIX;
  if (q.words && hay.spaced.startsWith(` ${q.words}`)) return SCORE_PREFIX;
  if (q.words && hay.spaced.includes(` ${q.words}`)) return SCORE_WORD;
  if (hay.text.includes(q.text)) return SCORE_SUBSTRING;
  if (q.tokens.length > 1 && q.tokens.every((tok) => hay.spaced.includes(` ${tok}`))) return SCORE_SUBSTRING;
  return 0;
}

export function scoreBest(hays: Prepared[], q: Query): number {
  let best = 0;
  for (const hay of hays) {
    const s = scoreOne(hay, q);
    if (s > best) {
      best = s;
      if (best === SCORE_PREFIX) break;
    }
  }
  return best;
}

/** Every word of the query starts some word of the text (order free). */
export function allWordsStart(hay: Prepared, q: Query): boolean {
  return q.tokens.length > 0 && q.tokens.every((tok) => hay.spaced.includes(` ${tok}`));
}
