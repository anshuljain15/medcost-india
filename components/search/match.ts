// Text matching for universal search, the /procedures filter and the form
// Combobox (docs/design-system.md §2.7). Pure functions, no React. Both sides
// are normalised with toLowerCase().normalize("NFC"), so Devanagari is kept
// as typed.
//
// Ranking: exact prefix (3) > word start (2) > substring (1) > no match (0).
// A query whose every "core" word starts some word of the text also counts as
// a substring match (1), so "replacement knee" still finds "Knee Replacement
// Surgery". Core words drop the filler people add around a treatment name
// ("मोतियाबिंद का ऑपरेशन", "cataract operation", "घुटने का इलाज"), and a Hindi
// word in the oblique case (घुटने, कूल्हे) also tries its plain form (घुटना,
// कूल्हा). These are fallbacks only: the typed text is always tried first.

/** A six-digit Indian PIN code (never starts with 0). */
export const PIN_RE = /^[1-9]\d{5}$/;

export const SCORE_PREFIX = 3;
export const SCORE_WORD = 2;
export const SCORE_SUBSTRING = 1;

// Word separators, including the Devanagari danda.
const SEPARATORS = /[\s\-–—/\\(),.:;&'"‘’“”+_|।]+/g;

// Words people put around a treatment name. Dropped from the all-words
// fallback when at least one other word remains, never from the typed text.
const FILLER = new Set([
  "का", "की", "के", "को", "में", "से", "पर", "और", "वाला", "वाली", "वाले",
  "ऑपरेशन", "आपरेशन", "सर्जरी", "इलाज", "खर्च", "खर्चा", "कीमत", "रेट", "दाम",
  "operation", "surgery", "treatment", "cost", "price", "rate", "charges",
]);

// Devanagari vowel signs: "े" (oblique) -> "ा" (direct), e.g. घुटने -> घुटना.
const OBLIQUE = "े";
const DIRECT = "ा";

export function norm(text: string): string {
  return text.toLowerCase().normalize("NFC");
}

/** A haystack prepared once per index row. `spaced` is " word word " for word-start checks. */
export type Prepared = { text: string; spaced: string };

export function prepare(text: string): Prepared {
  const n = norm(text).trim();
  return { text: n, spaced: ` ${n.replace(SEPARATORS, " ").trim()} ` };
}

/**
 * A prepared query; null when it is empty after trimming. `tokens` are the
 * words as typed; `core` is what the all-words fallback checks: each entry
 * lists the spellings that may start a word (the word, plus its plain form
 * for a Hindi oblique ending). `core` is null when there is no fallback (one
 * typed word with no other form).
 */
export type Query = { text: string; words: string; tokens: string[]; core: string[][] | null };

function forms(token: string): string[] {
  // Three characters at least, so short words never change meaning.
  if (token.length >= 3 && token.endsWith(OBLIQUE)) return [token, token.slice(0, -1) + DIRECT];
  return [token];
}

export function prepareQuery(raw: string): Query | null {
  const text = norm(raw).trim();
  if (!text) return null;
  const words = text.replace(SEPARATORS, " ").trim();
  const tokens = words ? words.split(" ") : [];
  const kept = tokens.filter((tok) => !FILLER.has(tok));
  const coreTokens = kept.length > 0 ? kept : tokens;
  const core = coreTokens.map(forms);
  const hasFallback = tokens.length > 1 || core.some((f) => f.length > 1);
  return { text, words, tokens, core: hasFallback && core.length > 0 ? core : null };
}

/** Every core word (in one of its forms) starts some word of the text, in any order. */
function coreMatches(hay: Prepared, core: string[][]): boolean {
  return core.every((alts) => alts.some((tok) => hay.spaced.includes(` ${tok}`)));
}

export function scoreOne(hay: Prepared, q: Query): number {
  if (hay.text.startsWith(q.text)) return SCORE_PREFIX;
  if (q.words && hay.spaced.startsWith(` ${q.words}`)) return SCORE_PREFIX;
  if (q.words && hay.spaced.includes(` ${q.words}`)) return SCORE_WORD;
  if (hay.text.includes(q.text)) return SCORE_SUBSTRING;
  if (q.core && coreMatches(hay, q.core)) return SCORE_SUBSTRING;
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

/** Every core word of the query starts some word of the text (order free). */
export function allWordsStart(hay: Prepared, q: Query): boolean {
  if (q.tokens.length === 0) return false;
  return coreMatches(hay, q.core ?? q.tokens.map((tok) => [tok]));
}
