# MedCost India: final redesign spec ("Calm Ledger")

This is the final spec. It starts from Proposal A, which had the best combined judge score (15/20). Ideas from B and C are added where they fit, and every judge must-fix is applied. Where the judges disagreed, §0.2 records the decision. Engineers can build pages in parallel once Phase 0 (§9.3) is merged.

I checked these facts in the repo while writing this spec:
- `q-pan.json` contains "PAN 40 Tablet". "Dolo 650 Tablet" and "Telma 40 Tablet" are also in the shards.
- 109 of the 2,684 hospital phone numbers have fewer than 8 digits (for example `0-0`, `-91`, `-DHS/NH/1262`).
- `nabhFlag` is `Y` for only 24 hospitals.
- `bedCount` and `icuBeds` contain `"0"` and `"0.0"` values.
- `rohiniCode` values end in `.0`.
- The hospital `city` field holds the display name, and its slug is `city.toLowerCase()`.
- CI runs Node 20 and `npm run build`, so any `prebuild` script runs there too.
- `translations` is not declared `as const`.
- `medicines.json` meta records dates for JA, NPPA, brands and kendras. HexaHealth, CGHS and the hospital directory have no recorded date.

---

## 0. Decisions

### 0.1 At a glance
1. **The site has Home plus three sections:** Treatment costs, Medicines and Hospitals. Every route belongs to one of them (§2.1).
2. **Phones (<768px) get a 4-tab bottom bar:** Home · Treatment · Medicines · Hospitals, with labels always visible. There is no hamburger and no "More" tab. The language switch is always visible in the header.
3. **Focus mode** applies to `/check-quote`, `/check-bill` and `/share-bill`. In focus mode there is no section nav and no tab bar. The header shows the service name, the language switch and a Close (X) button. Each screen has one sticky primary action.
4. **Home holds only:** the H1, one sentence, one search field, 3 task tiles that link straight to the tools, one short link list, one quiet share row and a sources block.
5. **The header has no filled button.** The theme control moves to the footer (Auto/Light/Dark, default Auto).
6. **Colours have one job each:**
   - Teal (`accent`) marks only things you can press and selected states.
   - Amber (`warn`) means only "above".
   - Red (`danger`) is only for form validation.
   - "Within", "below" and "unknown" verdicts are **neutral**: never teal (it looks tappable) and never green (it reads as approval).
   - Green (`success`) is only for confirmations: Same salt/strength/form, the share-done screen, the saving badge and the privacy lock.
7. **The visual base is Apple-calm:** a grey canvas, white inset groups, hairlines, a solid header, **no blur**, no gradients, and no scale animation.
8. **Every price block follows one order:** exact figure first, then a lakh caption, then a **SourceNote** directly underneath (source · qualifier · date or "date not recorded" · How we get prices). Every content page also ends with a **Sources and notes** block.
9. **It must be readable for older eyes:**
   - secondary text is at least 7:1 on canvas and surface
   - source, date and caveat lines are at least 14px
   - body text is 17–18px (Hindi 18–19px)
   - every touch target is at least 44px
10. **Hindi is first-class:**
    - Noto Sans Devanagari loads only under `lang="hi"`
    - `lang` is set on `<html>`
    - Hindi gets zero letter-spacing and taller lines
    - the guard against English flashing first lasts at most 600ms
11. **Pages get lighter:**
    - `/`, `/procedures`, `/hospitals` and `/rates` become server pages
    - the procedure, hospital and CGHS search indexes become static JSON in `public/data/search/`, written at build time by a Node script and fetched on first use
12. **The quote checker also accepts a final bill** ("A quote | A final bill") and runs on a single screen.

### 0.2 Where the judges disagreed
| Question | Decision | Reason |
|---|---|---|
| Indexes: route handlers (A) or build script (B/C)? | **Build script.** `scripts/build-search-index.mjs` runs from `prebuild`/`predev` and writes `public/data/search/*.json` (gitignored). The browser reads them only through `lib/staticData.ts`. | CLAUDE.md says "no API routes". The script is a build-time projection of the committed snapshot and uses the same read path as the medicine shards. Its header comment says it changes together with `lib/data.ts` when Postgres lands. |
| Lakh first or exact figure first? | **The exact figure is the hero.** Under it: "about ₹1.7–6.9 lakh", with the low end rounded down and the high end rounded up. | The figure then matches the source character for character, and lakh works as a reading aid. |
| "Usual range" or "market estimate"? | **"Market estimate" / "बाज़ार अनुमान".** Never "usual", and never "सीमा" for a range (use "दायरा"). | HexaHealth figures are editorial estimates, and "सीमा" reads as a legal limit. |
| Colour for "within" | Neutral strip with a check-circle icon and the word | Teal looks tappable, and green reads as "fair". |
| 4 or 5 tabs, and a `/check` hub? | **4 tabs, no `/check` route** | Each tool is one tap from home. |
| "Pan 40" example | **Keep it.** It is in the shards. | Rule: every example chip must be verified against the shards. |
| Map in dark theme | Positron tiles in both themes, with fixed map tokens | The page is list-first, so the map is low-stakes. |
| Share-bill length | 5 question screens plus Check answers ("Step n of 6") | Shorter flows keep a stressed caregiver going. |
| Room type without CGHS | Hidden, not disabled | It is only shown where it changes the result. |

---

## 1. Thesis

MedCost should behave like a calm, competent clinic receptionist. It asks what you came to do, answers with one clear number, says where that number came from, and keeps everything else one tap away.

The visual language is Apple Health:
- large left-aligned titles
- white inset lists on a soft grey canvas
- one teal accent reserved for things you can tap
- one large tabular price per screen

The rigour comes from the NHS:
- questions as headings
- a visible focus ring
- 44px targets
- an icon plus a word for every status

The design is built for a caregiver with a ₹12,000 Android phone in one hand and a bill in the other, often reading Hindi in daylight. That means:
- fewer choices: 3 sections and 3 task tiles
- bigger type
- the same provenance line under every price
- nothing that animates for show
- nothing hidden in a hamburger menu

---

## 2. Information architecture and navigation

### 2.1 Sections and where each route lives
| Section | Desktop nav (en / hi) | Tab (en / hi) | Hub | Routes inside | Active when the path starts with |
|---|---|---|---|---|---|
| Home | logo | Home / होम | `/` | — | `/` exactly |
| **Treatment costs** | Treatment costs / इलाज का खर्च | Treatment / इलाज | `/procedures` | `/procedures/[slug]`, `/check-quote`, `/rates` | `/procedures`, `/check-quote`, `/rates` |
| **Medicines** | Medicines / दवाइयाँ | Medicines / दवाइयाँ | `/medicines` | `/medicines/[slug]`, `/check-bill`, `/kendras` | `/medicines`, `/check-bill`, `/kendras` |
| **Hospitals** | Hospitals / अस्पताल | Hospitals / अस्पताल | `/hospitals` | `/hospitals/[city]`, `/hospitals/[city]/[slug]` | `/hospitals` |
| Utility (no tab) | — | — | — | `/share-bill`, `/methodology`, 404 (new `app/not-found.tsx`) | none |

`aria-current="page"` is set only on an exact path match. A section match gets `aria-current="true"`. Both cases also set `data-active` for styling.

### 2.2 Entry points (every route has at least two)
| Route | Reached from |
|---|---|
| `/check-quote` | home tile 1; `/procedures` top tile; procedure page primary button; hospital page link; `/check-bill` scope line; search "Tools and pages"; footer |
| `/check-bill` | home tile 2; `/medicines` tools tile; search; footer |
| `/medicines` | home tile 3; Medicines tab and nav; search; footer |
| `/kendras` | `/medicines` tools tile; medicine page inline finder link; hospital page; home "More" list; search (also for any 6-digit PIN query); footer |
| `/rates` | `/procedures` end link; home "More" list; search; footer |
| `/share-bill` | home share row; end of procedure, quote-result and hospital pages; search; footer |
| `/methodology` | every SourceNote and PageNotes block; home "More" list; footer |
| `/hospitals/**` | Hospitals tab and nav; home "More" list; search (hospital names); procedure page hospital links; footer |

### 2.3 Desktop and tablet header (≥768px)
From left to right:
- logo (links home)
- `<nav>` with **Treatment costs · Medicines · Hospitals**
- `ml-auto`, then search (hidden on `/`)
- language switch

There is no filled button, no theme toggle and no hotkey hints.
- Below 1024px, search is a 44px icon button.
- From 1024px, search is a field-shaped button that reads "Search treatments, medicines, hospitals".

Anatomy is in §7.

### 2.4 Phones (<768px)
- **Header (56px):** logo with wordmark, search icon button (not on `/`), language switch.
- **TabBar:** fixed at the bottom; 4 equal columns; 24px icon above a 13px semibold label. Height is `56px + env(safe-area-inset-bottom)`.
  - It is not rendered on focus routes.
  - It hides while a text field has focus, using CSS only (§3.1).
  - The body gets bottom padding while the bar exists.
- The `ThemeToggle` and the 36px hamburger menu are deleted.

### 2.5 Focus mode (`/check-quote`, `/check-bill`, `/share-bill`)
- **Header:**
  - logo mark (wordmark only from 768px)
  - a hairline divider
  - the service name, truncated
  - `ml-auto` language switch
  - an X IconButton labelled "Close and go back to {section}" that links to the section hub:

| Route | Service name | Close goes to |
|---|---|---|
| `/check-quote` | `nav.checkQuoteShort` | `/procedures` |
| `/check-bill` | `nav.checkBill` | `/medicines` |
| `/share-bill` | `nav.shareBill` | `/` |

- No section nav, search or tab bar.
- On phones the primary action sits in a `StickyActionBar`; on desktop it is inline.
- **Footer:** one slim block with the not-medical-advice line, the emergency line and "How we get prices".

### 2.6 Footer
The footer has four columns (Treatment costs, Medicines, Hospitals, About MedCost), then Appearance, then fine print. Together they link all 14 routes. Full anatomy is in §7.

### 2.7 Universal search and the static indexes
**Search in the UI:**
- `components/search/UniversalSearch.tsx` (client) is one combobox core.
- **Variants:**
  - `hero`: inline on home, on `/hospitals` with `scope="hospitals"`, and on the 404 page.
  - `sheet`: inside `SearchSheet`, a native `<dialog>`. It is full-screen below 768px and a 640px panel 96px from the top at 768px and up. It is opened from the header and loaded with `next/dynamic` on first open.
- **Mobile behaviour of `hero`:** on focus below 768px, the field calls `scrollIntoView({ block: "start" })`. With `scroll-padding-top: 72px`, the field sits under the header and results fill the space above the keyboard. The viewport also sets `interactiveWidget: "resizes-content"`.

**Data (static, no server):**
- `scripts/build-search-index.mjs` uses Node 20 and no dependencies. It reads only the committed `data/generated/{procedures,hospitals,cghs_rates}.json` and `data/source-dates.json`. It writes:
  - `public/data/search/procedures.json`: `{v:1, date: string|null, p: [slug, name, low, high, hospitalCount][]}`, about 5 KB.
  - `public/data/search/hospitals.json`: `{v:1, c: ["bangalore",…], l: ["Bangalore",…], h: [name, cityIndex, slug, pincode|null][]}`, about 150 KB raw and about 40 KB gzipped.
  - `public/data/search/cghs.json`: `{v:1, date, s: specialty[], r: [code, name, specialtyIndex, nabh 0|1, general, semi, private][]}`. Amounts stay as raw strings or null.
- `package.json` gets `"predev": "node scripts/build-search-index.mjs"` and `"prebuild": "node scripts/build-search-index.mjs"`. `.gitignore` gets `/public/data/search/`.
- `lib/staticData.ts` generalises the cached `fetchJson` from `lib/medicineShards.ts` (basePath-aware). It exports:
  - `fetchStaticJson<T>(path, fallback)`
  - `loadProcedureIndex()`, `loadHospitalIndex()`, `loadCghsIndex()`
  
  `medicineShards.ts` then imports `fetchStaticJson`. Indexes are fetched on the first focus of a field, and prefetched on pointerenter or focus of the header search button. They are never fetched on page load.

**Matching:**
- Normalise with `toLowerCase().normalize("NFC")` and keep Devanagari.
- Ranking: exact prefix > word-start > substring.
- Procedures also match `lib/search/synonyms.ts`.
- Medicines use the existing `searchMedicines(q, 4)`. It needs 3 or more Latin letters, because the shards are Latin.

**Result groups** (at most 4 rows each, ordered by best score, procedures first on ties):

| Group | Each row shows | Group footer |
|---|---|---|
| **Treatments · Bangalore prices** | name (DataText) + `MoneyRange` (callout) → `/procedures/[slug]` | footnote "Market estimates from HexaHealth · {date or 'date not recorded'}". This is the price's source and date. |
| **Medicines** | name + "Jan Aushadhi ₹x per unit" | "Jan Aushadhi prices from the PMBJP list, {date}". The last row is "See all medicines matching “q”" → `/medicines?q=`. |
| **Hospitals** | name (DataText) + "City · PIN 560034" → `/hospitals/[city]/[slug]` | — |
| **Tools and pages** | static list from `lib/search/routes.ts`: the 10 non-dynamic routes with their en/hi keywords | — |

**Other search behaviour:**
- **PIN query:** when the query matches `^[1-9]\d{5}$`, the top row is "Jan Aushadhi stores for PIN {pin}" → `/kendras?pin=`, followed by hospitals with that PIN.
- **Empty state:** "Try:" chips. EN: Knee replacement · Cataract · Dolo 650. HI: घुटना बदलना · मोतियाबिंद · Dolo 650. Then the first 4 tools.
- **Accessibility:** ARIA 1.2 combobox with `role="group"` + `aria-labelledby` per group. ↑/↓ move `aria-activedescendant` across groups. Enter navigates. Escape closes, and a second Escape clears. The result count is announced in a polite live region. The popover closes on outside `pointerdown`, never on a blur timeout.

### 2.8 `lib/nav.ts` (shared by header, tab bar, footer and 404)
```ts
export type SectionKey = "treatment" | "medicines" | "hospitals";
export const SECTIONS: { key: SectionKey; href: string; navKey: string; tabKey: string; icon: IconName; match: string[] }[] = [
  { key: "treatment", href: "/procedures", navKey: "nav.treatment", tabKey: "tab.treatment", icon: "clipboard", match: ["/procedures", "/check-quote", "/rates"] },
  { key: "medicines", href: "/medicines", navKey: "nav.medicines", tabKey: "tab.medicines", icon: "pill", match: ["/medicines", "/check-bill", "/kendras"] },
  { key: "hospitals", href: "/hospitals", navKey: "nav.hospitals", tabKey: "tab.hospitals", icon: "hospital", match: ["/hospitals"] },
];
export const FOCUS_ROUTES: Record<string, { serviceKey: string; closeHref: string; closeLabelKey: string }> = {
  "/check-quote": { serviceKey: "nav.checkQuoteShort", closeHref: "/procedures", closeLabelKey: "nav.treatment" },
  "/check-bill":  { serviceKey: "nav.checkBill",       closeHref: "/medicines",  closeLabelKey: "nav.medicines" },
  "/share-bill":  { serviceKey: "nav.shareBill",       closeHref: "/",           closeLabelKey: "nav.home" },
};
export function ariaCurrent(pathname: string, href: string, match: string[]): "page" | "true" | undefined;
// strip trailing "/" first; exact === href -> "page"; any match prefix -> "true"
```

---

## 3. Design tokens

### 3.1 `app/globals.css` (full replacement, ready to paste)
```css
@import "tailwindcss";

/* Theme comes only from [data-theme] on <html> (NO_FLASH_THEME_SCRIPT).
   This makes any stray `dark:` follow the user's choice, not the OS.
   New code must not use `dark:`: role tokens already switch. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* ============================== LIGHT ============================== */
:root {
  color-scheme: light;

  /* Surfaces */
  --canvas: #f5f5f7;            /* page */
  --surface: #ffffff;           /* cards, inset groups, inputs, tab bar */
  --surface-2: #f5f5f7;         /* sunken panel inside a card */
  --elevated: #ffffff;          /* sheets, popovers, listboxes (+ shadow-pop) */
  --fill: #ebedf0;              /* chips, segmented track, range track, pressed rows */
  --thumb: #ffffff;             /* selected segment */
  --hairline: #e3e5e8;          /* separators: decorative */
  --control: #7b8490;           /* input / chip / radio borders: >=3:1 */
  --scrim: rgb(0 0 0 / 0.4);

  /* Text */
  --label: #1d1d1f;
  --label-2: #4a5260;
  --label-3: #5f6774;

  /* Accent: things you can press + selected state. Nothing else. */
  --accent: #0f766e;
  --accent-hover: #115e59;
  --accent-fg: #ffffff;
  --accent-soft: #e8f6f3;
  --accent-soft-hover: #cdeee7;
  --accent-strong: #115e59;     /* text/icon on accent-soft */
  --focus: #115e59;

  /* Data marks */
  --range-band: #0d9488;
  --range-marker: #1d1d1f;
  --selection: #ccfbf1;

  /* Status */
  --warn-bg: #fff6e0;  --warn-fg: #7a3e00;  --warn-icon: #b45309;  --warn-line: #f0c36a;
  --danger-bg: #fdecea; --danger-fg: #b42318;
  --success-bg: #eaf6ee; --success-fg: #166534; --success-icon: #15803d;

  /* Map: tiles are light (positron) in BOTH themes, so these never switch */
  --map-pin: #0f766e; --map-cluster: #115e59; --map-on-pin: #ffffff; --map-stroke: #ffffff;

  /* Elevation (dark replaces with lighter surfaces) */
  --elev-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06);
  --elev-card-hover: 0 2px 4px rgb(0 0 0 / 0.05), 0 8px 24px rgb(0 0 0 / 0.10);
  --elev-pop: 0 2px 8px rgb(0 0 0 / 0.08), 0 12px 40px rgb(0 0 0 / 0.16);
  --elev-thumb: 0 3px 8px rgb(0 0 0 / 0.12), 0 3px 1px rgb(0 0 0 / 0.04);

  /* Font stack: the Devanagari web font joins only under lang="hi" */
  --font-stack: var(--font-inter), ui-sans-serif, system-ui, sans-serif;

  /* ---- Existing names, KEPT (components already use them) ---- */
  --background: var(--canvas);
  --foreground: var(--label);
  /* --surface is defined above (same name as before) */
  --brand-50: #f0fdfa; --brand-100: #ccfbf1; --brand-200: #99f6e4; --brand-300: #5eead4; --brand-400: #2dd4bf;
  --brand-500: #14b8a6; --brand-600: #0d9488; --brand-700: #0f766e; --brand-800: #115e59; --brand-900: #134e4a;
  --ink-900: var(--label);
  --ink-700: #343a44;
  --ink-500: var(--label-2);
  --ink-300: var(--control);
  --ink-100: var(--hairline);
  --ink-50: var(--surface-2);
  --contrast-bg: #1d1d1f;       /* kept for compatibility; no new usage */
  --contrast-fg: #ffffff;
  --warn-50: var(--warn-bg); --warn-200: var(--warn-line); --warn-700: var(--warn-icon); --warn-900: var(--warn-fg);
}

/* =============================== DARK =============================== */
[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #000000;
  --surface: #1c1c1e;
  --surface-2: #2c2c2e;
  --elevated: #2c2c2e;
  --fill: #333336;
  --thumb: #636366;
  --hairline: #38383a;
  --control: #86868b;
  --scrim: rgb(0 0 0 / 0.6);

  --label: #f5f5f7;
  --label-2: #c1c1c7;
  --label-3: #a1a1a8;

  --accent: #2dd4bf;
  --accent-hover: #5eead4;
  --accent-fg: #042f2e;
  --accent-soft: #0d332f;
  --accent-soft-hover: #134e4a;
  --accent-strong: #5eead4;
  --focus: #5eead4;

  --range-band: #0f9e8f;
  --range-marker: #f5f5f7;
  --selection: #134e4a;

  --warn-bg: #2b1f08;  --warn-fg: #fcd34d;  --warn-icon: #fbbf24;  --warn-line: #6b4a10;
  --danger-bg: #3a1412; --danger-fg: #ff8a80;
  --success-bg: #0c2a18; --success-fg: #86efac; --success-icon: #4ade80;

  --elev-card: 0 0 #0000;                     /* never `none`: Tailwind composes shadow lists */
  --elev-card-hover: 0 0 0 1px var(--hairline);
  --elev-pop: 0 0 0 1px rgb(255 255 255 / 0.08), 0 12px 40px rgb(0 0 0 / 0.6);
  --elev-thumb: 0 0 0 0.5px rgb(255 255 255 / 0.10);

  /* Dark accent scale: inverted, no duplicate steps (600 != 700) */
  --brand-50: #0a2523; --brand-100: #0d332f; --brand-200: #134e4a; --brand-300: #115e59; --brand-400: #0f766e;
  --brand-500: #14b8a6; --brand-600: #2dd4bf; --brand-700: #5eead4; --brand-800: #99f6e4; --brand-900: #ccfbf1;
  --ink-700: #d1d1d6;
  /* ink-900/500/300/100/50, background, foreground, warn-50..900 follow their var() targets */
}

/* =================== Tailwind colour + shadow mapping =================== */
@theme inline {
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-elevated: var(--elevated);
  --color-fill: var(--fill);
  --color-thumb: var(--thumb);
  --color-hairline: var(--hairline);
  --color-control: var(--control);
  --color-scrim: var(--scrim);
  --color-label: var(--label);
  --color-label-2: var(--label-2);
  --color-label-3: var(--label-3);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-fg: var(--accent-fg);
  --color-accent-soft: var(--accent-soft);
  --color-accent-soft-hover: var(--accent-soft-hover);
  --color-accent-strong: var(--accent-strong);
  --color-focus: var(--focus);
  --color-range-band: var(--range-band);
  --color-range-marker: var(--range-marker);
  --color-warn-bg: var(--warn-bg); --color-warn-fg: var(--warn-fg); --color-warn-icon: var(--warn-icon); --color-warn-line: var(--warn-line);
  --color-danger-bg: var(--danger-bg); --color-danger-fg: var(--danger-fg);
  --color-success-bg: var(--success-bg); --color-success-fg: var(--success-fg); --color-success-icon: var(--success-icon);

  /* existing names */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-contrast: var(--contrast-bg);
  --color-contrast-fg: var(--contrast-fg);
  --color-brand-50: var(--brand-50);   --color-brand-100: var(--brand-100); --color-brand-200: var(--brand-200);
  --color-brand-300: var(--brand-300); --color-brand-400: var(--brand-400); --color-brand-500: var(--brand-500);
  --color-brand-600: var(--brand-600); --color-brand-700: var(--brand-700); --color-brand-800: var(--brand-800);
  --color-brand-900: var(--brand-900);
  --color-ink-900: var(--ink-900); --color-ink-700: var(--ink-700); --color-ink-500: var(--ink-500);
  --color-ink-300: var(--ink-300); --color-ink-100: var(--ink-100); --color-ink-50: var(--ink-50);
  --color-warn-50: var(--warn-50); --color-warn-200: var(--warn-200); --color-warn-700: var(--warn-700); --color-warn-900: var(--warn-900);

  --shadow-card: var(--elev-card);
  --shadow-card-hover: var(--elev-card-hover);
  --shadow-pop: var(--elev-pop);
  --shadow-thumb: var(--elev-thumb);

  --font-sans: var(--font-stack);
}

/* ===== Scale tokens: NOT inline, so the media/lang overrides below apply ===== */
@theme {
  --radius-badge: 6px; --radius-thumb: 9px; --radius-control: 12px; --radius-card: 16px; --radius-sheet: 20px;
  --container-read: 45.875rem;   /* 734px */
  --container-page: 66.75rem;    /* 1068px */
  --ease-standard: cubic-bezier(0.25, 0.1, 0.3, 1);
  --ease-fade: cubic-bezier(0.4, 0, 0.6, 1);

  --text-display: 2.125rem;  --text-display--line-height: 2.5rem;   --text-display--letter-spacing: -0.022em; --text-display--font-weight: 600;
  --text-title1: 1.75rem;    --text-title1--line-height: 2.125rem;  --text-title1--letter-spacing: -0.02em;   --text-title1--font-weight: 600;
  --text-title2: 1.375rem;   --text-title2--line-height: 1.75rem;   --text-title2--letter-spacing: -0.015em;  --text-title2--font-weight: 600;
  --text-title3: 1.25rem;    --text-title3--line-height: 1.625rem;  --text-title3--letter-spacing: -0.01em;   --text-title3--font-weight: 600;
  --text-figure: 1.875rem;   --text-figure--line-height: 2.25rem;   --text-figure--letter-spacing: -0.02em;   --text-figure--font-weight: 600;
  --text-lead: 1.1875rem;    --text-lead--line-height: 1.75rem;     --text-lead--letter-spacing: -0.012em;
  --text-headline: 1.0625rem;--text-headline--line-height: 1.5rem;  --text-headline--letter-spacing: -0.011em; --text-headline--font-weight: 600;
  --text-body: 1.0625rem;    --text-body--line-height: 1.625rem;    --text-body--letter-spacing: -0.011em;
  --text-callout: 1rem;      --text-callout--line-height: 1.5rem;   --text-callout--letter-spacing: -0.006em;
  --text-footnote: 0.875rem; --text-footnote--line-height: 1.25rem; --text-footnote--letter-spacing: 0;
  --text-caption: 0.8125rem; --text-caption--line-height: 1.125rem; --text-caption--letter-spacing: 0; --text-caption--font-weight: 600;
}

@media (min-width: 48rem) {
  :root {
    --text-display: 3.25rem;  --text-display--line-height: 3.5rem; --text-display--letter-spacing: -0.025em;
    --text-title1: 2.5rem;    --text-title1--line-height: 2.75rem;
    --text-title2: 1.75rem;   --text-title2--line-height: 2.125rem; --text-title2--letter-spacing: -0.017em;
    --text-title3: 1.375rem;  --text-title3--line-height: 1.75rem;
    --text-figure: 2.5rem;    --text-figure--line-height: 2.875rem;
    --text-lead: 1.3125rem;   --text-lead--line-height: 2rem;
    --text-body: 1.125rem;    --text-body--line-height: 1.75rem; --text-body--letter-spacing: -0.014em;
  }
}

/* Devanagari: web font, no tracking, taller lines, +1px body */
html:lang(hi) {
  --font-stack: var(--font-inter), var(--font-deva), ui-sans-serif, system-ui, sans-serif;
  --text-display--letter-spacing: 0; --text-title1--letter-spacing: 0; --text-title2--letter-spacing: 0;
  --text-title3--letter-spacing: 0; --text-lead--letter-spacing: 0; --text-headline--letter-spacing: 0;
  --text-body--letter-spacing: 0; --text-callout--letter-spacing: 0;
  --text-display--line-height: 1.3; --text-title1--line-height: 1.35; --text-title2--line-height: 1.4;
  --text-title3--line-height: 1.45; --text-headline--line-height: 1.55; --text-lead--line-height: 1.65;
  --text-body: 1.125rem; --text-body--line-height: 1.72;
  --text-callout--line-height: 1.7; --text-footnote--line-height: 1.65; --text-caption--line-height: 1.55;
}
@media (min-width: 48rem) { html:lang(hi) { --text-body: 1.1875rem; } }

@layer base {
  html { scroll-padding-top: 72px; scroll-padding-bottom: 96px; -webkit-text-size-adjust: 100%; }
  body { background: var(--canvas); color: var(--label); font-family: var(--font-stack); -webkit-font-smoothing: antialiased; }
  :focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  ::selection { background: var(--selection); color: var(--label); }
  summary { list-style: none; }
  summary::-webkit-details-marker { display: none; }
}

/* Tab bar: room for it, and hide it while the keyboard is up (no JS) */
body:has([data-tabbar]) { padding-bottom: calc(3.5rem + env(safe-area-inset-bottom)); }
@media (min-width: 48rem) { body:has([data-tabbar]) { padding-bottom: 0; } }
body:has(:is(input:not([type="radio"], [type="checkbox"], [type="file"]), textarea, select):focus) [data-tabbar] { display: none; }

/* Returning Hindi users: hide chrome + main until the first Hindi render, max 600ms */
html[data-locale-pending] :is(#site-header, main, #site-footer, [data-tabbar]) { opacity: 0; animation: mc-reveal 0s linear 0.6s forwards; }
@keyframes mc-reveal { to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

After the migration (Phase 5), add `--color-*: initial;` as the first line of `@theme inline`. This removes Tailwind's stock palette so `text-white`, `bg-slate-*` and similar classes stop compiling. The legacy names stay.

### 3.2 Measured contrast (WCAG 2.x)
| Text or mark | Light | Dark |
|---|---|---|
| `label` on surface / canvas / fill | 16.83 / 15.46 / 14.35 | 15.63 / 19.29 / 11.57 (elevated 12.80) |
| `label-2` (secondary, source lines) on surface / canvas / fill | **7.87 / 7.23 / 6.71** | **9.50 / 11.72 / 7.03** (elevated 7.78) |
| `label-2` on accent-soft / warn-bg | 7.09 / 7.32 | 7.65 / 9.00 |
| `label-3` (tertiary, placeholders) on surface / canvas / fill | 5.71 / 5.24 / 4.87 | 6.63 / 8.18 / 4.90 |
| `accent` (links) on surface / canvas / fill / accent-soft | 5.47 / 5.03 / 4.67 / 4.93 | 9.14 / 11.28 / 6.77 / 7.37 |
| `accent-fg` on accent / accent-hover | 5.47 / 7.58 | 7.77 / 9.78 |
| `accent-strong` on accent-soft / accent-soft-hover | 6.83 / 6.13 | 9.27 / 6.41 |
| `label` on thumb (selected segment) | 16.83 | 5.50 |
| `warn-fg` on warn-bg; `warn-icon` on warn-bg | 7.75; 4.67 | 11.18; 9.66 |
| `danger-fg` on danger-bg / surface | 5.75 / 6.57 | 7.14 / 7.45 |
| `success-fg` on success-bg; `success-icon` on surface | 6.42; 5.02 | 11.00; 9.76 |
| `ink-700` (legacy body) on surface / canvas | 11.45 / 10.51 | 11.18 / 13.80 |
| `brand-700` on brand-50; `brand-800` on brand-50 | 5.25; 7.27 | 10.90; 12.80 |
| `contrast-fg` on contrast-bg | 16.83 | 16.83 |
| Non-text: `control` border on surface / canvas | 3.79 / 3.48 | 4.70 (3.85 on elevated) |
| Non-text: `focus` ring on canvas / surface | 6.96 / 7.58 | 14.20 / 11.50 |
| Non-text: `range-band` against `fill` track | 3.19 | 3.78 |

### 3.3 Token rules (enforced by the greps in §9.2)
- Components use role tokens only.
- Banned: raw hex, `text-white`, `bg-white`, Tailwind stock colours, `dark:`, `backdrop-blur` and `backdrop-filter`, gradients, and `border-dashed` (except `PatientReported`).
- Existing `brand-*`, `ink-*` and `warn-50…900` usages keep working. They are migrated page by page and never used in new code.
- `bg-brand-600 text-white` becomes `bg-accent text-accent-fg`. (White on #0d9488 is 3.74, which fails.)
- Text on a tinted background uses that tint's own foreground (`warn-fg`, `danger-fg`, `success-fg`, `accent-strong`), or `label` / `label-2`.
- Radii: badge 6, segmented thumb 9, inputs/segmented track/non-pill controls 12, cards/inset groups 16, sheets 20. Buttons and chips are full pills. The logo mark uses `rounded-lg`.
- Spacing (4px base):
  - page gutter `px-4 md:px-6`
  - page top `pt-6 md:pt-12`, bottom `pb-16`
  - sections `space-y-10 md:space-y-16`
  - heading to content `mb-3 md:mb-4`
  - form fields `space-y-6`
  - card padding `p-5 md:p-6`
  - rows `px-4 py-3`, at least 56px tall
- Widths: only two. `max-w-read` (734px) for single-column pages. `max-w-page` (1068px) for home, the city page, `/rates`, the header and the footer.
- Motion:
  - colour/background changes: `duration-150 ease-fade`
  - transform/opacity: `duration-250 ease-standard`, 300ms maximum
  - allowed: tile hover lift `motion-safe:hover:-translate-y-0.5` (never scale), sheet slide-up, progress width, chevron rotate
  - not allowed: scroll reveals, parallax, autoplay
- Shadows: `shadow-card` only on interactive cards (TaskTile) and the hero search field. `shadow-pop` on popovers and sheets. Static inset groups get no shadow and no border.

---

## 4. Typography

### 4.1 Fonts (`app/layout.tsx`)
```ts
import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" }); // latin-ext carries ₹ (U+20B9)
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "600"], variable: "--font-deva", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { template: "%s · MedCost India", default: "MedCost India — was your hospital bill fair?" },
  description: "Check hospital quotes, hospital bills and medicine bills against public prices. Every price is a range with its source and date.",
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
};
// <html lang="en" suppressHydrationWarning className={`${inter.variable} ${deva.variable}`}>
//   <body className="flex min-h-dvh flex-col bg-background font-sans text-label antialiased">
//     <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT + NO_FLASH_LOCALE_SCRIPT }} />
//     <ThemeProvider><LanguageProvider><LiveRegionProvider>
//       <SkipLink/><SiteHeader/><main id="main" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main><SiteFooter/><TabBar/>
```
- The `next/font` variables go on `<html>` so that `--font-stack` resolves at `:root`.
- `--font-deva` appears in the stack **only** under `html:lang(hi)`. English page views never request the Devanagari web font. The always-visible "हिंदी" switch label renders in the system Devanagari face (built into Android and Windows).
- `themeColor` is one of only two allowed hex exceptions in TSX (§9.2).
- Every route sets an English `title` in its own `metadata` export, for example `"Check a hospital quote or bill"`.

### 4.2 Scale
| Token | Mobile | ≥768px | Weight | Use |
|---|---|---|---|---|
| `text-display` | 34/40 | 52/56 | 600 | home H1 only |
| `text-title1` | 28/34 | 40/44 | 600 | page H1, question H1 |
| `text-title2` | 22/28 | 28/34 | 600 | section H2, stat values |
| `text-title3` | 20/26 | 22/28 | 600 | verdict sentence, patient medians, reference ID |
| `text-figure` | 30/36 | 40/46 | 600 | the one hero price per block (always `tabular-nums`) |
| `text-lead` | 19/28 | 21/32 | 400 | one line under the H1 |
| `text-headline` | 17/24 | 17/24 | 600 | labels, buttons, row values, tile titles |
| `text-body` | 17/26 (hi 18) | 18/28 (hi 19) | 400 | reading text, row titles, **all inputs** (so iOS and Android don't zoom) |
| `text-callout` | 16/24 | 16/24 | 400 / 500 | row subtitles, hints, chips, nav links |
| `text-footnote` | 14/20 | 14/20 | 400 / 600 | **minimum size for source, date and caveat lines** |
| `text-caption` | 13/18 | 13/18 | 600 | tab labels and badges only |

Hindi uses 0 tracking and line-heights of 1.3–1.45 for headings and 1.7 for body (§3.1).

Only weights 400, 500 and 600 are used. `font-bold`, `uppercase`, `tracking-*`, `text-xs`, `text-sm` and `text-[Npx]` are banned.

### 4.3 Element recipes
| Element | Classes |
|---|---|
| Home H1 | `text-display text-label text-balance` |
| Page H1 | `text-title1 text-label text-balance` |
| Section H2 | `text-title2 text-label` |
| Lead | `mt-3 max-w-[60ch] text-lead text-label-2` |
| Paragraph | `max-w-[65ch] text-body text-label` (long secondary prose: `text-label-2`) |
| Price hero | `text-figure tabular-nums text-label` |
| Source / date / caveat | `text-footnote text-label-2` |
| Data text (names, addresses, compositions) | wrapped in `<DataText>` |

Everything is left-aligned, including the home hero.

---

## 5. Component library: `components/ui/`

### 5.1 Rules that apply to every component
- Use tokens only. Every interactive element is at least 44×44px.
- Every status is an icon plus a word.
- Every string goes through `t()`. Data text is never translated.
- Components are server-safe unless marked **(client)**.
- Focus uses the global `:focus-visible` ring. `focus-visible:outline-none` is allowed only on stretched links (the parent shows the ring), and `focus:outline-none` only on `<main>` and on `tabIndex={-1}` result headings.
- Money always renders through `formatINR` / `formatINRUnit` inside `<Money>` or `<MoneyRange>`. Never call `formatINR(Number(...))` on CGHS strings.

### 5.2 Icon set: `components/ui/Icon.tsx`
- One component holding inline SVGs on a 24px grid: `fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"`.
- `aria-hidden` by default. A `label` prop turns the icon into `role="img"`.
- Paths may be adapted from Lucide (ISC licence; keep the licence comment at the top of the file). Do not add a dependency.

`search x chevron-right chevron-left chevron-down home clipboard pill hospital store receipt camera lock info alert check check-circle arrow-down-circle source users phone directions share plus trash external star`

That is 27 icons. Every Unicode glyph used as UI (→ ← ◀ ▶ × ✓ ★ • ↗) is replaced by one of these. `star` is decorative only (rating stars, `aria-hidden`).

The **logo mark** (`components/chrome/Logo.tsx`, and the same shape in `app/icon.svg`) is a 28px `rounded-lg bg-accent` square with an `accent-fg` "range" glyph: two 10px vertical ticks joined by a horizontal bar (|—|).

### 5.3 Signatures
```ts
// Icon.tsx
export type IconName = "search"|"x"|"chevron-right"|"chevron-left"|"chevron-down"|"home"|"clipboard"|"pill"|"hospital"|"store"|"receipt"|"camera"|"lock"|"info"|"alert"|"check"|"check-circle"|"arrow-down-circle"|"source"|"users"|"phone"|"directions"|"share"|"plus"|"trash"|"external"|"star";
export function Icon(p: { name: IconName; className?: string; label?: string }): JSX.Element;

// Layout
export function PageShell(p: { width?: "read" | "page"; className?: string; children: React.ReactNode }): JSX.Element;            // PageShell.tsx
export function PageHeader(p: { back?: { href: string; label: string }; title: React.ReactNode; lead?: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode; display?: boolean }): JSX.Element; // PageHeader.tsx
export function BackLink(p: { href: string; label: string }): JSX.Element;                                                       // BackLink.tsx
export function SectionHeader(p: { id?: string; title: string; as?: "h2" | "h3"; action?: { href: string; label: string } }): JSX.Element; // SectionHeader.tsx
export function PageNotes(p: { anchor: MethodAnchor; linkKey?: string; children?: React.ReactNode }): JSX.Element;               // PageNotes.tsx

// Actions
type ButtonBase = { variant?: "primary" | "tonal" | "plain"; size?: "md" | "lg"; block?: boolean; icon?: IconName; children: React.ReactNode };
export function Button(p: ButtonBase & React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element;                              // Button.tsx
export function ButtonLink(p: ButtonBase & { href: string; external?: boolean }): JSX.Element;                                   // Button.tsx
export function ActionLink(p: { href: string; external?: boolean; children: React.ReactNode }): JSX.Element;                     // ActionLink.tsx
export function InlineLink(p: { href: string; children: React.ReactNode }): JSX.Element;                                         // InlineLink.tsx
export function ExtLink(p: { href: string; children: React.ReactNode }): JSX.Element;                                            // InlineLink.tsx
export function IconButton(p: { icon: IconName; label: string; href?: string; onClick?: () => void }): JSX.Element;               // IconButton.tsx

// Containers and lists
export function Card(p: { as?: "div" | "section" | "article"; className?: string; children: React.ReactNode }): JSX.Element;      // Card.tsx
export function TaskTile(p: { href: string; icon: IconName; title: string; body: string; note?: React.ReactNode; level?: 2 | 3 }): JSX.Element; // TaskTile.tsx
export function InsetGroup(p: { heading?: string; headingId?: string; footer?: React.ReactNode; children: React.ReactNode }): JSX.Element; // InsetGroup.tsx
export function ListRow(p: { href?: string; external?: boolean; leading?: IconName; title: React.ReactNode; subtitle?: React.ReactNode; meta?: React.ReactNode; badges?: React.ReactNode; trailing?: React.ReactNode; layout?: "inline" | "stack" }): JSX.Element; // ListRow.tsx
export function Disclosure(p: { summary: React.ReactNode; variant?: "card" | "inline"; defaultOpen?: boolean; id?: string; children: React.ReactNode }): JSX.Element; // Disclosure.tsx
export function Callout(p: { tone?: "info" | "warn" | "danger"; title?: string; icon?: IconName; children: React.ReactNode }): JSX.Element; // Callout.tsx
export function EmptyState(p: { icon: IconName; title: string; body?: React.ReactNode; action?: { href: string; label: string } }): JSX.Element; // EmptyState.tsx
export function Badge(p: { tone?: "neutral" | "accent" | "warn" | "success"; icon?: IconName; children: React.ReactNode }): JSX.Element; // Badge.tsx
export function StatTile(p: { label: string; value: React.ReactNode; tone?: "neutral" | "warn" }): JSX.Element;                  // StatTile.tsx
export function Table(p: { caption: string; columns: { key: string; label: string; numeric?: boolean }[]; children: React.ReactNode }): JSX.Element; // Table.tsx
export function Skeleton(p: { className?: string }): JSX.Element;                                                               // Skeleton.tsx

// Prices and provenance
export type MethodAnchor = "market-prices" | "govt-rates" | "medicines" | "stores" | "checks" | "patient-bills" | "hospitals" | "reviews" | "dates" | "corrections";
export function Money(p: { value: number | null; perUnit?: boolean }): JSX.Element;                                              // Money.tsx
export function MoneyRange(p: { low: number | null; high: number | null }): JSX.Element;                                         // Money.tsx
export function LakhCaption(p: { low: number; high: number }): JSX.Element | null;                                               // Money.tsx (null under ₹1 lakh)
export function PriceFigure(p: { label: string; low: number | null; high?: number | null; perUnit?: boolean; qualifier?: string; children?: React.ReactNode }): JSX.Element; // PriceFigure.tsx
export function SourceNote(p: { source: string; href?: string; qualifier?: string; date: string | null; anchor: MethodAnchor; compact?: boolean }): JSX.Element; // SourceNote.tsx
export function RangeBar(p: { low: number; high: number; amount?: number; above?: boolean; ariaLabel: string }): JSX.Element;      // RangeBar.tsx (client)
export function PriceCompare(p: { ja: number | null; brandMedian: number | null; unit: "tablet" | "capsule" }): JSX.Element;      // PriceCompare.tsx
export function VerdictCard(p: { status: "within" | "above" | "below" | "unknown"; sentence: string; headingRef?: React.Ref<HTMLHeadingElement>; children?: React.ReactNode }): JSX.Element; // VerdictCard.tsx (client)
export function StatusLine(p: { status: "above" | "within" | "noCeiling" | "checkUnits" | "pick"; label: string; sentence?: string }): JSX.Element; // VerdictCard.tsx
export function PatientReported(p: { count?: number; children: React.ReactNode }): JSX.Element;                                  // PatientReported.tsx
export function PrivacyNote(p: { children: React.ReactNode }): JSX.Element;                                                      // PrivacyNote.tsx
export function DataText(p: { children: React.ReactNode }): JSX.Element;                                                         // DataText.tsx (client)

// Forms (client)
type FieldBase = { id: string; label: React.ReactNode; hint?: React.ReactNode; error?: string };
export function TextField(p: FieldBase & React.InputHTMLAttributes<HTMLInputElement>): JSX.Element;                              // TextField.tsx
export function MoneyField(p: FieldBase & { value: string; onValueChange: (digits: string) => void }): JSX.Element;               // TextField.tsx
export function PinField(p: FieldBase & { value: string; onValueChange: (pin: string) => void }): JSX.Element;                    // TextField.tsx
export function Select(p: FieldBase & React.SelectHTMLAttributes<HTMLSelectElement>): JSX.Element;                               // Select.tsx
export type ComboOption = { value: string; label: string; group?: string; keywords?: string[]; lang?: "en" | "hi" };
export function Combobox(p: FieldBase & { options: ComboOption[]; groupOrder?: string[]; groupLabel?: (g: string) => string; value: string | null; onChange: (v: string | null) => void; placeholder?: string; footerOption?: { value: string; label: string } }): JSX.Element; // Combobox.tsx
export function SegmentedControl<T extends string>(p: { name: string; legend: string; legendHidden?: boolean; options: { value: T; label: string; lang?: string }[]; value: T; onChange: (v: T) => void }): JSX.Element; // SegmentedControl.tsx
export function ChoiceChip(p: { type: "radio" | "checkbox" | "toggle"; name?: string; value?: string; checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }): JSX.Element; // ChoiceChip.tsx
export function ChipRow(p: { wrap?: boolean; label?: string; children: React.ReactNode }): JSX.Element;                          // ChoiceChip.tsx
export function ChoiceList(p: { name: string; legend: React.ReactNode; legendAsH1?: boolean; hint?: string; error?: string; type: "radio" | "checkbox"; options: { value: string; label: string; hint?: string; reveal?: React.ReactNode }[]; value: string | string[]; onChange: (v: string | string[]) => void }): JSX.Element; // ChoiceList.tsx
export function PhotoInput(p: { label: string; variant?: "primary" | "tonal"; onFile: (f: File) => void; disabled?: boolean }): JSX.Element; // PhotoInput.tsx
export function ErrorSummary(p: { errors: { fieldId: string; message: string }[]; titleRef?: React.Ref<HTMLHeadingElement> }): JSX.Element; // ErrorSummary.tsx
export function StepHeader(p: { step: number; total: number; onBack?: () => void }): JSX.Element;                               // StepHeader.tsx
export function ProgressBar(p: { value: number; label: string; liveText?: string }): JSX.Element;                               // ProgressBar.tsx
export function StickyActionBar(p: { children: React.ReactNode }): JSX.Element;                                                 // StickyActionBar.tsx
export function Sheet(p: { open: boolean; onClose: () => void; label: string; children: React.ReactNode }): JSX.Element;          // Sheet.tsx
export function LanguageSwitch(): JSX.Element;                                                                                  // LanguageSwitch.tsx
export function ThemeSwitch(): JSX.Element;                                                                                     // ThemeSwitch.tsx
export function LiveRegionProvider(p: { children: React.ReactNode }): JSX.Element; export function useAnnounce(): (msg: string) => void; // LiveRegion.tsx
```
Chrome lives in `components/chrome/`: `SiteHeader.tsx`, `TabBar.tsx`, `SiteFooter.tsx`, `SkipLink.tsx`, `Logo.tsx` and `SearchSheet.tsx`, all **(client)** (§7).

### 5.4 Class recipes
| Component | Exact recipe |
|---|---|
| **PageShell** | `mx-auto w-full px-4 pt-6 pb-16 md:px-6 md:pt-12` + `max-w-read` (default) or `max-w-page` |
| **PageHeader** | wrapper `mb-8 md:mb-10`; BackLink first; H1 `text-title1 text-label text-balance` (`display` prop gives `text-display`); lead `mt-3 max-w-[60ch] text-lead text-label-2`; meta `mt-2 text-callout text-label-2`; children `mt-4` |
| **BackLink** | `-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-callout font-medium text-accent hover:bg-fill`. Contains `chevron-left` (`size-5`), an sr-only `nav.backTo` prefix and the label. |
| **SectionHeader** | `mb-3 flex flex-wrap items-baseline justify-between gap-x-4 md:mb-4`; H2 `text-title2 text-label`; action = ActionLink |
| **PageNotes** | `<aside aria-labelledby="page-notes" class="mt-12 border-t border-hairline pt-6">`; H2 `text-headline text-label` (`common.sourcesNotes`); body `mt-3 max-w-[65ch] space-y-3 text-footnote text-label-2`; last line is an InlineLink to `/methodology#{anchor}` |
| **Button** base | `inline-flex items-center justify-center gap-2 rounded-full text-headline transition-colors duration-150 ease-fade disabled:cursor-not-allowed` |
| primary | `min-h-12 px-6 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-fill disabled:text-label-3`. **One per screen.** |
| tonal | `min-h-12 px-5 bg-accent-soft text-accent-strong hover:bg-accent-soft-hover disabled:bg-fill disabled:text-label-3` |
| plain | `-mx-1 min-h-11 px-1 text-accent underline-offset-4 hover:underline` |
| `size="lg"` / `block` | `min-h-14 px-7` / `w-full md:w-auto` |
| **ActionLink** | `inline-flex min-h-11 items-center gap-1 text-headline text-accent underline-offset-4 hover:underline` + `chevron-right size-4.5` |
| **InlineLink** | `text-accent underline decoration-1 underline-offset-2 hover:text-accent-hover` (always underlined) |
| **ExtLink** | InlineLink + `target="_blank" rel="noopener noreferrer"` + `external` icon `ml-0.5 inline size-4 align-[-2px]` + sr-only `common.newTab` |
| **IconButton** | `inline-flex size-11 items-center justify-center rounded-full text-label transition-colors duration-150 hover:bg-fill`; icon `size-6`; `aria-label={label}` |
| **Card** | `rounded-card bg-surface p-5 md:p-6` (no border, no shadow) |
| **TaskTile** | wrapper `group relative flex items-center gap-4 rounded-card bg-surface p-5 shadow-card transition-[box-shadow,transform] duration-250 ease-standard hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus`; icon chip `flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong`; title `text-headline text-label` holding `<Link class="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none">`; body `mt-0.5 text-callout text-label-2`; note `mt-2`; chevron `ml-auto size-5 shrink-0 text-label-3`. The tile has one link only and is never wrapped in `<a>`. Its title equals the destination H1 (or the destination's nav label). |
| **InsetGroup** | `<section>`; heading `px-4 pb-2 text-footnote font-semibold text-label-2`; `<ul class="overflow-hidden rounded-card bg-surface">`; footer `px-4 pt-2 text-footnote text-label-2` |
| **ListRow** | `<li class="relative after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-hairline last:after:hidden">` (with a leading icon: `after:left-14`). Inner (`Link` or `div`): `flex min-h-14 items-center gap-3 px-4 py-3`; linked rows add `transition-colors duration-150 hover:bg-fill focus-visible:outline-offset-[-3px]`. Leading icon `size-6 text-label-2`. Text column `min-w-0 flex-1`: title `text-body text-label`, subtitle `text-callout text-label-2`, meta `text-footnote text-label-2`, badges `mt-1 flex flex-wrap gap-1.5`. Trailing `ml-auto shrink-0 text-right text-headline tabular-nums text-label`. Chevron (linked rows only) `size-5 shrink-0 text-label-3`. `layout="stack"`: the trailing value renders inside the text column below 768px (`text-callout`, left-aligned) and in the trailing slot from 768px, using one element positioned with `grid grid-cols-[minmax(0,1fr)_auto]` and `col-span-full md:col-span-1`. |
| **Disclosure** (card) | `<details class="group rounded-card bg-surface">`; summary `flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 text-headline text-label`; chevron `size-5 text-label-2 transition-transform duration-250 group-open:rotate-180`; body `space-y-3 px-4 pb-4 text-body text-label-2` |
| Disclosure (inline) | drops `bg-surface` and `rounded-card`; adds `border-t border-hairline` |
| **Callout** | `flex gap-3 rounded-card p-4 text-callout`; icon `mt-0.5 size-5 shrink-0`; title `text-headline`. Tones: info `bg-fill text-label` (icon `text-label-2`), warn `bg-warn-bg text-warn-fg` (icon `text-warn-icon`), danger `bg-danger-bg text-danger-fg` |
| **EmptyState** | `rounded-card bg-surface p-6`; icon `size-8 text-label-3`; title `mt-3 text-headline text-label`; body `mt-1 text-callout text-label-2`; action ActionLink |
| **Badge** | `inline-flex min-h-6 items-center gap-1 rounded-badge px-2 text-caption`. Tones: neutral `bg-fill text-label`, accent `bg-accent-soft text-accent-strong`, warn `bg-warn-bg text-warn-fg`, success `bg-success-bg text-success-fg`. Icon `size-3.5`. |
| **StatTile** | `rounded-card bg-surface p-4`; label `text-footnote font-semibold text-label-2`; value `mt-1 text-title2 tabular-nums text-label`; warn tone: value `text-warn-fg` + `alert` icon `text-warn-icon` |
| **Table** (`/rates` at ≥768px) | `w-full text-callout`; `<caption class="sr-only">`; th `sticky top-14 bg-surface px-3 py-2 text-left text-footnote font-semibold text-label-2`; numeric cells `text-right tabular-nums`; rows `border-b border-hairline hover:bg-fill`; no zebra stripes |
| **Skeleton** | `rounded-control bg-fill motion-safe:animate-pulse` (row: `h-14`) |
| **Money / MoneyRange** | `<span class="tabular-nums whitespace-nowrap">`. The range is each number `whitespace-nowrap` with the dash `<span class="text-label-2"> – </span>`, so the line can wrap only after the dash. Null renders `common.notListed` in `text-label-2`, never "₹NaN". |
| **LakhCaption** | `mt-1 text-callout text-label-2`, using `common.lakhRange` / `common.croreRange` from `lakhParts()` (§5.5) |
| **PriceFigure** | label `text-footnote font-semibold text-label-2`; figure `mt-1 text-figure tabular-nums text-label`; LakhCaption; qualifier `mt-1 text-callout text-label-2`; children (SourceNote) |
| **SourceNote** | `<p class="mt-3 flex gap-1.5 text-footnote text-label-2">` + `source` icon `mt-0.5 size-4 shrink-0`. Text: `source.label` + ExtLink(source) + ` · qualifier` + ` · ` + (date ? `source.retrieved{date: formatISODate(date)}` : `source.noDate`) + ` · ` + InlineLink(`source.howWeGet` → `/methodology#{anchor}`). `compact` drops the icon and the methodology link (used in search footers). It always sits **directly under** the price block it supports and **never invents a date**. |
| **RangeBar** | `role="img" aria-label={ariaLabel}`, wrapper `relative pt-10 pb-7`. Track `relative h-2 rounded-full bg-fill`. Band `absolute inset-y-0 rounded-full bg-range-band` from low to high. Marker `absolute -top-1.5 h-5 w-1 rounded-full bg-range-marker ring-2 ring-surface` (when `above`: `bg-warn-icon`). Marker chip `absolute -top-9 whitespace-nowrap rounded-full bg-elevated px-2.5 py-1 text-footnote font-semibold tabular-nums text-label shadow-pop`, positioned `style={{ left: p+"%", transform: "translateX(-"+p+"%)" }}`, so it never clips at 0% or 100%. End labels sit under the band ends with the same left/translate trick: `text-footnote tabular-nums text-label-2`. Axis = [min(low, amount) − 10% of span, max(high, amount) + 10%]. |
| **PriceCompare** | `space-y-3`; each row `grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3`: label `text-callout text-label`, value `text-headline tabular-nums text-label`, bar row `col-span-2 h-2 rounded-full bg-fill` > `h-2 rounded-full` (JA `bg-range-band`, brands `bg-label-3`) with widths on one shared axis. The NPPA ceiling is never drawn against 2022 brand MRPs. |
| **VerdictCard** | `<section aria-live="polite" class="overflow-hidden rounded-card bg-surface">`; strip `<h2 ref tabIndex={-1} class="flex items-center gap-2 px-5 py-3 text-headline focus:outline-none">`. Tones: **above** `bg-warn-bg text-warn-fg` + `alert` (`text-warn-icon`); **within** `bg-fill text-label` + `check-circle` (`text-label-2`); **below** `bg-fill text-label` + `arrow-down-circle`; **unknown** `bg-fill text-label` + `info`. Body `space-y-5 p-5`; sentence `text-title3 text-label`; lists `list-disc space-y-2 pl-5 text-body text-label marker:text-label-3` |
| **StatusLine** | `flex gap-2`; icon `mt-0.5 size-5`; label `text-headline` (above: `text-warn-fg` + `alert` in `text-warn-icon`; within: `text-label` + `check-circle`; noCeiling / checkUnits / pick: `text-label` + `info`); sentence `text-body text-label` |
| **PatientReported** | `rounded-card border border-dashed border-control bg-surface-2 p-5` (the **only** dashed element on the site); header `flex items-center gap-2 text-footnote font-semibold text-label-2` with `users` icon and `source.patientLabel` · `source.patientCount`; medians `text-title3 tabular-nums text-label`, **never `text-figure` and never accent**. Always its own section, at least one heading away from any SourceNote. |
| **PrivacyNote** | `flex items-start gap-1.5 text-callout text-label-2`; `lock` icon `mt-0.5 size-5 shrink-0 text-success-icon`. Placed directly next to every photo button. |
| **DataText** | `<span translate="no" lang={locale === "hi" ? "en" : undefined}>`. `translate="no"` stops browser auto-translate from mangling names. |
| **TextField** | label `mb-1 block text-headline text-label`; hint `mb-2 text-callout text-label-2`; input `h-14 w-full rounded-control border border-control bg-surface px-4 text-body text-label placeholder:text-label-3 transition-colors duration-150 focus-visible:border-accent aria-[invalid=true]:border-2 aria-[invalid=true]:border-danger-fg`; error `mt-2 flex gap-1.5 text-callout font-medium text-danger-fg` + `alert` icon `size-4.5`, linked by `aria-describedby` |
| **MoneyField** | `relative`; prefix `pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-body text-label-2` "₹"; input `pl-9 tabular-nums`, `inputMode="numeric" autoComplete="off"`, digits only; readback `mt-2 text-callout text-label-2` "₹2,40,000 · ₹2.4 lakh" (tied by `aria-describedby`, not live) |
| **PinField** | TextField + `inputMode="numeric" maxLength={6} autoComplete="postal-code" pattern="[1-9][0-9]{5}"` |
| **Select** | TextField input classes + `appearance-none pr-11`; `chevron-down` `pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-label-2` |
| **Combobox** | input as TextField + `pr-11` (clear button IconButton); listbox `absolute inset-x-0 top-full z-30 mt-2 max-h-[min(50dvh,360px)] overflow-y-auto rounded-card bg-elevated py-2 shadow-pop`; group label `px-4 pt-3 pb-1 text-footnote font-semibold text-label-2`; option `flex min-h-12 cursor-pointer items-center px-4 text-body text-label aria-selected:bg-fill`. It shows the full grouped list on focus, so it doubles as a picker. Below 768px it scrolls itself to the top on focus. ARIA 1.2. |
| **UniversalSearch** | field `h-14 w-full rounded-control border border-control bg-surface pl-12 pr-12 text-body text-label shadow-card placeholder:text-label-3` (hero) / no shadow (sheet); leading `search` icon `absolute left-4 size-6 text-label-2`; popover `absolute inset-x-0 top-full z-50 mt-2 max-h-[min(60dvh,480px)] overflow-y-auto rounded-card bg-elevated py-2 shadow-pop` (sheet: inline, no popover); options as Combobox but `min-h-14 gap-3` with type icon; "Try" row: ChipRow |
| **SegmentedControl** | `<fieldset>` + `<legend>` (`text-headline text-label mb-2`, or `sr-only`); track `grid auto-cols-fr grid-flow-col gap-0.5 rounded-control bg-fill p-0.5` (48px); segment `<label class="relative">` with `<input type="radio" class="peer sr-only">` + `<span class="flex min-h-11 cursor-pointer items-center justify-center rounded-thumb px-3 text-callout font-medium text-label transition-[background-color,box-shadow] duration-150 ease-fade peer-checked:bg-thumb peer-checked:font-semibold peer-checked:shadow-thumb peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">`. The selected look comes **only** from `:checked` plus tokens. |
| **ChoiceChip** | input `peer sr-only` (toggle: `<button aria-pressed>`); chip `inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-control bg-surface px-4 text-callout font-medium text-label transition-colors duration-150 hover:bg-fill peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-accent-strong aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-strong peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus` + `check` icon `size-4` when selected (state is never shown by colour alone) |
| **ChipRow** | scroll: `-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]`; `wrap`: `flex flex-wrap gap-2` |
| **ChoiceList** | `<fieldset>`; legend = the question (`text-title1` when `legendAsH1`, else `text-headline`); list `mt-4 space-y-2`; row `flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-control bg-surface px-4 text-body text-label has-[:checked]:border-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft`; radio `size-6 shrink-0 appearance-none rounded-full border-2 border-control checked:border-[7px] checked:border-accent`; checkbox `size-6 shrink-0 appearance-none rounded-md border-2 border-control checked:border-accent checked:bg-accent` + overlaid `check` icon `text-accent-fg`; reveal `mt-2 ml-9 space-y-4` |
| **PhotoInput** | `<label class="… Button recipe … has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus">` + `camera` icon + label + `<input type="file" accept="image/*" class="sr-only">`. **No `capture` attribute**, so Android offers Camera or Gallery (WhatsApp photos work). |
| **ErrorSummary** | `role="alert"`; `rounded-card bg-danger-bg p-4 text-danger-fg`; title `<h2 tabIndex={-1} class="text-headline focus:outline-none">` (`share.errorSummary`), focused on submit; list of InlineLinks (`text-danger-fg underline`) to `#fieldId` |
| **StepHeader** | Back = plain Button with `chevron-left` (`share.back`); caption `mt-2 text-footnote text-label-2` (`share.stepOf`); bar `mt-2 h-1 rounded-full bg-fill` > `h-1 rounded-full bg-accent transition-[width] duration-250 ease-standard`, `role="progressbar"` with `aria-valuemin/max/now` and `aria-label` |
| **ProgressBar** | StepHeader bar + `<p aria-live="polite" class="mt-2 text-callout text-label-2">` |
| **StickyActionBar** | `fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:static md:mt-8 md:border-0 md:bg-transparent md:p-0`; the page adds `pb-28 md:pb-0` |
| **Sheet** | native `<dialog>` + `showModal()` (focus trap and Escape for free): `m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-sheet bg-elevated p-0 text-label shadow-pop backdrop:bg-scrim md:m-auto md:max-w-[640px] md:rounded-sheet`; SearchSheet: `h-[100dvh] max-h-none rounded-none md:mt-24 md:h-auto md:rounded-sheet`; header row with title + IconButton `x` (`common.close`); open animation `motion-safe` opacity + `translate-y-4 → 0`, 250ms |
| **LanguageSwitch** | one pill naming the **other** language in its own script: `<button class="inline-flex min-h-11 items-center rounded-full bg-fill px-4 text-callout font-semibold text-label transition-colors duration-150 hover:bg-accent-soft hover:text-accent-strong">` containing sr-only `nav.languageSwitch` + `<span lang={other}>{LOCALES[other].name}</span>` ("हिंदी" / "English") |
| **ThemeSwitch** | SegmentedControl `footer.appearance`: Auto / Light / Dark → `useTheme().setMode` |
| **LiveRegion** | one `<div aria-live="polite" class="sr-only">` in the layout; `useAnnounce()` for search counts, OCR progress and results appearing |

### 5.5 Helpers and data plumbing (Phase 0)
```ts
// lib/format.ts (add; keep formatINR, formatINRUnit, formatISODate)
export function lakhParts(low: number, high: number): { low: string; high: string; unit: "lakh" | "crore" } | null;
//   null when high < 1,00,000. Crore when high >= 1,00,00,000 (2 decimals), else lakh (1 decimal).
//   LOW rounds DOWN, HIGH rounds UP: never narrower than the source. Trailing ".0" trimmed.
export function amountShort(n: number): { value: string; unit: "lakh" | "crore" } | null; // MoneyField readback; null under 1 lakh
export function parseCghsAmount(s: string | null): number | null;  // "Unlisted"/""/junk -> null. Ends ₹NaN.
export function telHref(phone: string | null): string | null;
//   first number only (split on , / ; " or "), keep a leading "+", strip non-digits; null if < 8 digits
//   ("0-0", "-91", "11-0", "-DHS/NH/1262" -> null: 109 rows). 12 digits starting "91" -> "tel:+91…".
export function cleanCount(s: string | null): number | null;      // "120.0" -> 120; "0", "0.0", junk -> null (hide the row)
export function cleanCode(s: string | null): string | null;       // "8900080378735.0" -> "8900080378735"

// lib/types.ts (add)
export type SourceDates = { hexahealth: string | null; cghs: string | null; directory: string | null };
// data/source-dates.json (new, committed): {"hexahealth": null, "cghs": null, "directory": null} — owner fills ISO dates later.
// lib/data.ts (add): export function getSourceDates(): SourceDates;   // server only; pages pass dates down as props

// lib/procedureGroups.ts (display grouping + share-bill category; display only, never clinical claims)
export type GroupKey = "heart"|"bones"|"eye"|"stomach"|"weightLoss"|"women"|"kidney"|"cancer"|"general"|"entLungs"|"cosmetic"|"other";
export const GROUP_ORDER: GroupKey[]; // as listed below
export const PROCEDURE_GROUP: Record<string, { group: GroupKey; shareCategory: Category }>;
```
The `PROCEDURE_GROUP` assignment covers all 61 slugs. Any unlisted slug defaults to `other` / `other`.

| Group | Slugs | Share category |
|---|---|---|
| heart | angioplasty, coronary-angiography, ct-angiography, heart-bypass-surgery, open-heart-surgery | cardiac |
| bones | knee-arthroscopy, knee-replacement-surgery, partial-knee-replacement, total-hip-replacement | orthopaedic |
| eye | cataract-surgery, laser-cataract-surgery, contoura-vision, icl-eye-surgery, lasik-surgery, smile-eye-surgery | eye |
| stomach | laparoscopic-cholecystectomy, open-cholecystectomy, ercp-test, mrcp-test, ascitic-tap, liver-transplant, living-donor-liver-transplantation, orthotopic-liver-transplant | gastro |
| weightLoss | bariatric-surgery, gastric-bypass-surgery, sleeve-gastrectomy-surgery, endoscopic-sleeve-gastroplasty, swallowable-weight-loss-balloon | gastro |
| women | abortion, surgical-abortion, dilatation-and-curettage, fibroid-surgery, hysterectomy, hysteroscopy | gynae |
| kidney | kidney-transplant, dj-stent-removal, laser-circumcision, stapler-circumcision | kidney_urology |
| cancer | chemotherapy, radiotherapy | cancer |
| general | piles-laser-treatment, piles-stapler-surgery, fissure-laser-surgery, fistula-laser-treatment, laparoscopic-hiatal-hernia-repair, laparoscopic-umbilical-hernia-surgery, umbilical-hernia-surgery, lipoma-removal, varicose-veins-laser-treatment, breast-lump-removal-surgery | general_surgery |
| entLungs | fess (→ ent), bronchoscopy (→ other) | per slug |
| cosmetic | breast-augmentation, breast-lift-surgery, breast-reduction-surgery, gynecomastia-surgery, labiaplasty, laser-vaginal-tightening, rhinoplasty, tummy-tuck-surgery | other |
| other | endovascular-embolization | other |

**`lib/search/synonyms.ts`** (`Record<slug, string[]>`) holds 2–5 search-only aliases per slug. Results always display the source name. Minimum set:
- knee-replacement-surgery: knee, घुटना, घुटना बदलना, ghutna
- partial-knee-replacement: knee, घुटना
- total-hip-replacement: hip, कूल्हा
- cataract-surgery and laser-cataract-surgery: मोतियाबिंद, motiyabind
- lasik / smile / contoura / icl: चश्मा हटाना, specs removal
- laparoscopic-cholecystectomy and open-cholecystectomy: gallbladder, पित्त की थैली, pathri
- piles-*: बवासीर, bawasir
- fissure: फ़िशर
- fistula: भगंदर
- hernia rows: हर्निया
- angioplasty: stent, स्टेंट
- heart-bypass-surgery: bypass, बाईपास
- hysterectomy: uterus removal, बच्चेदानी
- kidney-transplant: किडनी
- liver-transplant*: लिवर
- chemotherapy: chemo, कीमो
- radiotherapy: सिकाई, radiation
- abortion / surgical-abortion: गर्भपात
- bariatric / sleeve / gastric bypass: weight loss, मोटापा

**`lib/search/routes.ts`** lists `{href, titleKey, keywords: string[]}` for `/procedures`, `/check-quote`, `/rates`, `/medicines`, `/check-bill`, `/kendras`, `/hospitals`, `/share-bill`, `/methodology` and `/`.

**Providers:**
- **ThemeProvider:**
  - `type Mode = "system" | "light" | "dark"`; `useTheme(): { mode; theme: "light" | "dark"; setMode(m) }`.
  - It writes `medcost-theme` only when the user picks Light or Dark. "system" removes the key and follows `matchMedia` changes live.
  - `NO_FLASH_THEME_SCRIPT` keeps its name, key and resolution order (saved value first, otherwise system).
  - `toggleTheme` is removed together with `ThemeToggle.tsx`.
- **LanguageProvider:**
  - It exports `NO_FLASH_LOCALE_SCRIPT`: `(function(){try{if(localStorage.getItem('medcost-locale')==='hi'){var d=document.documentElement;d.lang='hi';d.setAttribute('data-locale-pending','')}}catch(e){}})();`
  - In `useEffect([locale])` it sets `document.documentElement.lang = locale` and removes `data-locale-pending`. This runs after the first Hindi render commits; the CSS fallback reveals content at 600ms regardless.
- **`LOCALES`** gains `name`: `{code:"en", label:"EN", name:"English"}`, `{code:"hi", label:"हिं", name:"हिंदी"}`.
- **`lib/staticData.ts`:** `fetchStaticJson` plus the index loaders (§2.7). `lib/medicineShards.ts` imports from it. Fetch paths stay unchanged.
- **Map (`components/HospitalMap.tsx`):**
  - Colours come from `getComputedStyle(document.documentElement).getPropertyValue("--map-pin" | "--map-cluster" | "--map-on-pin" | "--map-stroke")`.
  - Positron tiles in both themes.
  - Popups are built with `document.createElement`, never innerHTML: name (textContent) plus a "View hospital" link with the basePath-aware href.
  - Error text uses `t("city.mapFailed")`.

---

## 6. Page by page (mobile-first)

The fold is a 360×740 phone minus the 56px header and the 56px tab bar, which leaves about 628px (focus routes: about 684px minus the sticky bar). Each page lists: data split, above the fold, then, disclosures, deleted, and how must-keeps are presented.

### `/`: Home (`app/page.tsx` is a server component; `components/HomeView.tsx` is client)
- **Data:** the server computes `{procedures: 61, hospitals: 2684, cities: 6, medicines: 1403}` from `getAllProcedures()`, `getAllHospitals()`, `getCities()` and `getAllMedicineGroups()`. It passes only those numbers. No `lib/data` import reaches the client, so the 1.45 MB hospitals chunk leaves the home bundle.
- **Container:** `max-w-page`, content column `max-w-read`.
- **Above the fold:**
  1. H1 `text-display` "Was your hospital bill fair?" (`home.title`).
  2. Lead `home.lead`.
  3. `UniversalSearch variant="hero"` with the visible label `search.label`.
  4. "Try:" chips.
  5. The top of the first task tile.
- **Then:**
  1. `SectionHeader` `home.tasksHeading`, then 3 TaskTiles (stacked; `md:grid md:grid-cols-3 md:gap-4`):
     - `clipboard` **Check a hospital quote or bill** (`nav.checkQuote`) → `/check-quote`; body `home.tileQuoteBody`
     - `receipt` **Check a medicine bill** (`nav.checkBill`) → `/check-bill`; body `home.tileBillBody`; note = PrivacyNote `home.actionPrivate`
     - `pill` **Find a cheaper medicine** (`nav.findMedicine`) → `/medicines`; body `home.tileMedicineBody`
  2. InsetGroup `home.moreHeading` with 4 ListRows:
     - `hospital` Find a hospital (`home.moreHospitalsSub`)
     - `store` Find a Jan Aushadhi store (`home.moreKendrasSub`)
     - `clipboard` Govt (CGHS) rates (`home.moreRatesSub`)
     - `source` How we get prices (`home.moreMethodSub`)
  3. Share row: a single-row InsetGroup. `users` icon, title `home.ctaHeading`, subtitle `home.shareBody` → `/share-bill`.
  4. PageNotes (`market-prices`): `home.coverage` (tabular) and `home.sourcesLabel`.
- **Deleted:** eyebrow pill, `bg-gradient-to-b`, the centred hero, the Share action card, the `bg-contrast` band, `text-[#cbd5e1]` / `text-[#0f172a]`, the `"use client"` directive on the page, `ProcedureSearch.tsx`, `home.orSearch`.
- **Must-keeps:**
  - The Bangalore qualifier: search group label `search.groupTreatments` and tile 1 body.
  - Ranges via MoneyRange in search rows, plus a dated source footer.
  - The sources line and methodology link in PageNotes.
  - The privacy line on tile 2.
  - Links to `/check-quote`, `/check-bill` and `/share-bill`.

### `/procedures`: Treatment costs hub (server page; client `components/ProcedureListView.tsx`)
- **Data:** slim rows `[slug, name, low, high, hospitalCount, hasCghs]` plus `getSourceDates().hexahealth`.
- **Container:** `max-w-read`.
- **Above the fold:**
  1. H1 `procedures.title` "Treatment costs in Bangalore".
  2. Lead `procedures.subtitle` (kept; it names HexaHealth and the "confident match" rule).
  3. One TaskTile: `nav.checkQuote` with body `procedures.quoteTileBody` → `/check-quote`.
  4. TextField `procedures.filterLabel` (with placeholder). It matches names and synonyms.
  5. SourceNote: HexaHealth (→ hexahealth.com) · `source.marketQualifier` · date · `market-prices`.
- **Then:**
  - One InsetGroup per group in `GROUP_ORDER`, headed `procedures.group.*`.
  - Each ListRow (`layout="stack"`) shows: title = name (DataText); subtitle = `MoneyRange` (tabular); meta `procedures.rowMeta` (when count > 0) and ` · procedures.govRate` (when CGHS matched); chevron.
  - While filtering, groups flatten, the count is announced (`procedures.count`), and `procedures.noMatch` shows when empty.
  - Filtering hides rows only; all 61 links stay in the HTML.
- **End:** ActionLink `procedures.ratesLink` → `/rates`; PageNotes (`market-prices`) with `procedure.footerNote`.
- **Deleted:** the 61-card grid, the "CGHS reference" jargon badge, the unlabelled small filter, the `"use client"` page.

### `/procedures/[slug]`
- **Data:** server props: the procedure, `getSourceDates()`, and the hospital rows sorted by `avg` ascending with nulls last.
- **Above the fold:**
  1. BackLink `procedure.back` → `/procedures`.
  2. H1 = name (DataText).
  3. Meta `procedure.meta` (or `procedure.metaNoHospitals`).
  4. Card holding a PriceFigure: label `procedure.marketRange` "Market estimate"; figure `MoneyRange`; LakhCaption; qualifier `source.marketQualifier`; SourceNote with source "HexaHealth" (ExtLink to `sourceUrl`, never the raw URL as link text), date, anchor `market-prices`.
  5. Primary ButtonLink `procedure.checkQuote` → `/check-quote#{slug}`, moved here from the bottom of the page.
- **Section `procedure.govHeading` "Govt (CGHS) rate":**
  - Static InsetGroup with rows General ward / Semi-private / Private (`quote.ward.*`), each with a trailing `Money(parseCghsAmount(...))` (null renders "Not listed").
  - Footer `procedure.govTier`.
  - SourceNote: `source.cghs` → CGHS site (href = the URL recorded in `data-pipeline/sources/cghs.py`, link text "cghs.mohfw.gov.in") · date · `govt-rates`.
  - Inline Disclosure `procedure.cghsWhat`: `quote.cghsExplain` + `procedure.matchedLine` {name} ({code}).
  - **No match:** Callout info `procedure.noCghsMatch` + InlineLink `procedure.howWeMatch` → `#govt-rates`. This state stays visible.
- **Section `procedure.hospitalsHeading`** (`id="hospitals"`):
  - Footnote `procedure.sortNote`.
  - InsetGroup ListRows (`layout="stack"`): title = hospital name (DataText); trailing `MoneyRange(min, max)`; meta `procedure.typical`.
  - Rows link (with chevron) **only** when `hospitalSlug` is set. Unmatched names are plain text with no chevron.
  - The first 8 rows are visible; the rest go in a Disclosure `procedure.showAllHospitals`.
  - Footer `procedure.unlinkedNote`.
  - SourceNote HexaHealth with qualifier `source.marketQualifier`.
  - Empty: Callout info `procedure.noHospitalData`.
- **Disclosure** `procedure.askHeading`: `quote.askList` + `quote.rights`.
- **End:** share row `procedure.shareRow` → `/share-bill`; PageNotes (`market-prices`) with `procedure.footerNote`.
- **Deleted:** the second "editorial estimate" sentence, the 4-column table and its horizontal scroll, the bottom CTA block, raw-URL link text.

### `/check-quote`: focus mode, service name `nav.checkQuoteShort`
- **Data:** server props: slim procedure list (+ CGHS ward amounts) and the HexaHealth date.
- **Container:** `max-w-read`, `pb-28 md:pb-0`.
- **Above the fold:**
  1. H1 `quote.title` "Check a hospital quote or bill".
  2. Lead `quote.lead`.
  3. Form fields, `space-y-6`:
     1. SegmentedControl `quote.kindLabel`: `quote.kind.quote` | `quote.kind.bill` (default quote).
     2. Combobox `quote.procedureLabel` (placeholder `quote.procedureSearch`). Options are the 61 grouped procedures plus synonyms. `#slug` preselects (kept). Footer option `quote.notListed` reveals Callout info `quote.notListedBody` with a `/share-bill` link.
     3. MoneyField `quote.amountLabel` / `quote.amountLabelBill`, hint `quote.amountHint`.
     4. **Only when the procedure has a CGHS match:** ChoiceChip radio row (wrap) `quote.wardLabel`: General ward · Semi-private · Private · `quote.ward.notSure` (default Not sure). Otherwise the control is **not rendered**.
  4. StickyActionBar: primary `quote.submit` / `quote.submitBill`, disabled until a procedure and an amount are set.
- **Before any result:** Disclosure `quote.askDisclosure` (askList + rights) only.
- **On submit:**
  - The result renders below the form and updates live on later edits.
  - Focus moves to the VerdictCard heading and the status is announced.
- **Result, in order:**
  1. **VerdictCard:**
     - Strip `quote.status.{within|above|below|unknown}`. lowerHalf and upperHalf both map to *within*.
     - Sentence `quote.verdict.*` ("This amount…").
     - RangeBar (chip `quote.yourAmount`; ends `quote.lowEnd` / `quote.highEnd`; `ariaLabel` = `quote.rangeAria`; `above` when status is above).
     - Line "MoneyRange · `source.marketQualifier`" + SourceNote HexaHealth (`market-prices`).
     - `quote.whatToDo` list. For below, `quote.belowTip` comes first, then `quote.askList`, or `quote.askListBill` when kind is bill.
     - Callout info titled `quote.rightsHeading`: `quote.rights`.
     - **Unknown:** Callout info `quote.verdict.unknown`, no RangeBar.
  2. Card `quote.hospitalsHeading`: `quote.hospitalsBelow` (or `quote.hospitalsNone`) + ActionLink `quote.seeHospitals` → `/procedures/{slug}#hospitals`.
  3. Card `quote.cghsHeading`: one of `quote.cghsMultiple` (ward named), `quote.cghsPickRoom` with all three ward amounts when Not sure, or `quote.cghsNone`. Then Disclosure `procedure.cghsWhat` (cghsExplain, line item, code, NABH) and SourceNote CGHS.
  4. Row: tonal ShareButton (`quote.shareText` / `quote.shareTextBill`, typed amount and range only) + plain `quote.again` (scrolls to the form and focuses the amount field).
  5. Share row `quote.sharePaid` → `/share-bill`.
- **PageNotes** (`checks`): `quote.disclaimer` + `check.methodologyLink`.
- **Deleted:** eyebrow, subtitle, the static ask/rights/disclaimer stack shown before any input, the native 61-option `<select>`, the disabled ward buttons, `quote.wardNoCghs`, ◀ ▶, the dashed box.

### `/rates`: Govt (CGHS) rates (server page; client `components/RateExplorer.tsx` refactored)
- **Data:** the server passes `{n, m, specialties}` and the CGHS date. The client fetches `data/search/cghs.json` on first focus of search or specialty and shows 3 Skeleton rows meanwhile. The 1 MB chunk is gone.
- **Container:** `max-w-page` (list column `max-w-read` below 768px).
- **Above the fold:**
  1. BackLink `procedure.back` → `/procedures`.
  2. H1 `rates.title`.
  3. Lead `rates.lead`.
  4. Disclosure inline `rates.about` → `rates.subtitle` (counts).
  5. TextField `rates.searchLabel` (placeholder `rates.searchPlaceholder`).
  6. Select `rates.specialtyLabel` (`rates.allSpecialties` first).
  7. SegmentedControl `rates.hospitalType`: `rates.nabh` | `rates.nonNabh` (default NABH).
  8. Disclosure inline `rates.whatNabh`.
- **Empty state:** `rates.promptSearch` (search-first; no blind dump).
- **Results:**
  - Live count `rates.matchingRows`.
  - Below 768px: ListRows with title = name (DataText), meta `rates.codeLabel`, then a `mt-2 grid grid-cols-3 gap-2` `<dl>`: dt `text-footnote text-label-2` (ward names), dd `text-headline tabular-nums` with `Money(parseCghsAmount(...))` ("Not listed" in `text-label-2`).
  - From 768px: Table with columns code / procedure / general / semi-private / private.
  - Tonal `common.showMore` (50 at a time).
- **PageNotes:** SourceNote CGHS (`govt-rates`).
- **Deleted:** "Rate Explorer" name, eyebrow, `formatINR(Number(...))` (the ₹NaN path), hard-coded `Non-`.

### `/medicines`: Medicines hub and search (client `MedicineSearchView`, with `?q=` read via `useSearchParams` in a Suspense boundary)
- **Container:** `max-w-read`.
- **Above the fold:**
  1. H1 `medicines.title` "Find a cheaper medicine".
  2. Lead `medicines.lead`.
  3. TextField `medicines.searchLabel` (placeholder `medicines.searchPlaceholder` "Brand or salt, e.g. Pan 40 or pantoprazole", which is kept and verified; hint `medicines.searchHint`).
  4. Directly under the field: tonal PhotoInput `medicines.scan.button`, PrivacyNote `medicines.scan.privacy`, footnote `medicines.scan.handwriting`.
  5. Empty-state "Try:" chips Pan 40 · Dolo 650 · pantoprazole (all verified in the shards).
- **Results** (below the controls, so nothing jumps):
  - 3 Skeleton rows while fetching; count announced.
  - InsetGroup ListRows: title name (DataText), badge neutral `medicines.kindGroup` / `medicines.kindBrand` (13px; replaces `text-[10px]`), meta `perUnitJa` / `perUnitBrand` (keeps "(2022)") / `noJaPrice`, chevron.
  - Footer `medicines.brandsCredit` (Kaggle, Nov 2022, CC BY-SA 4.0). This closes the missing licence credit.
- **OCR:** ProgressBar (`medicines.scan.reading`). Word chips are 44px toggle ChoiceChips and are **never auto-searched**.
- **When there is no query:** SectionHeader `medicines.toolsHeading`, then TaskTiles `nav.checkBill` → `/check-bill` and `nav.kendras` → `/kendras`.
- **PageNotes** (`medicines`): `medicines.coverage`, `medicines.disclaimer`, link `medicines.methodologyLink`.
- **Deleted:** eyebrow, long subtitle, `capture="environment"`, the arrows inside strings.

### `/medicines/[slug]`
- **Data:** server props only. `lib/medicines.ts` stays server-only.
- **Above the fold:**
  1. BackLink `medicines.back` → `/medicines`.
  2. H1 composition (DataText).
  3. Meta "{form} · {release}".
  4. Badges: accent `medicines.badgeJa` and neutral `medicines.badgeNppa`, each only when true.
  5. Callout-free line `medicines.contains`: … (`text-callout text-label-2`).
  6. **Answer Card:**
     - Label `medicines.pricePerUnit`.
     - PriceCompare (`medicines.jaHeading` vs `medicines.typicalBrand`).
     - Headline `medicines.for30.{unit}` + success Badge `medicines.lessPct`.
     - Success badges with `check` icon: `medicines.same.salt` · `.strength` · `.form`. These are true by construction (exact composition).
     - Footnote `medicines.savingsCaveat`.
     - SourceNote `medicines.jaSource` (PMBJP, date, janaushadhi.gov.in, `medicines`) and SourceNote brands (Kaggle, Nov 2022, CC BY-SA 4.0).
     - If there is no JA price: a single PriceFigure for the brand median + `medicines.jaNone` / `medicines.jaNoPrice`.
- **Section `medicines.buyHeading`:** inline compact KendraFinder (PinField + primary `kendras.search`; shard fetch unchanged). It shows up to 5 rows, then ActionLink `medicines.seeAllStores` → `/kendras?pin=`.
- **Section `medicines.nppaHeading`:** PriceFigure `medicines.nppaPrice` ("excluding GST" stays in the string), body `medicines.nppaExplain`, SourceNote `medicines.nppaSource` (S.O., date, NLEM) → nppaindia.nic.in. Otherwise Callout info `medicines.nppaNone`.
- **Section `medicines.brandsHeading`:**
  - Footnote `medicines.brandsShowing` (honest truncation).
  - ListRows: brand (DataText); subtitle maker · pack (also shown on mobile); trailing per-unit Money + meta pack MRP; neutral Badge `medicines.timesGeneric` (≥2×) or `medicines.morePct`.
  - First 10 rows; the rest in a Disclosure `medicines.showAllBrands`.
  - SourceNote `medicines.brandsSource`.
- **Disclosure** `medicines.jaDetails`: JA pack, MRP, PMBJP code, `jaNoPrice` state.
- **Disclosure** `medicines.relatedHeading`: opens with Callout warn `medicines.relatedNote`, then `relatedStrengths` / `relatedExtraSalt` lists.
- **PageNotes** (`medicines`): `medicines.disclaimer` + `medicines.methodologyLink`.
- **Deleted:** the two mismatched cards, five stacked `text-xs` caveat blocks, drug codes in the main reading path.

### `/kendras`
- **Container:** `max-w-read`. `?pin=` is kept, with a Suspense boundary.
- **Above the fold:**
  1. BackLink `medicines.back`.
  2. H1 `kendras.title`.
  3. Lead `kendras.lead`.
  4. PinField `kendras.pinLabel` with hint `kendras.pinHint`.
  5. Primary `kendras.search` (block on phones). Invalid input shows inline error `kendras.invalidPin`.
- **Directly above the results:** Callout info titled `kendras.beforeTravel`: `kendras.verify` + ExtLink `kendras.official` + `kendras.coverageGap`.
- **Results:**
  - Headline `kendras.results` (live).
  - InsetGroup KendraRows: title = address (DataText); subtitle district, state; meta `kendras.storeCode`; badge success-free neutral `kendras.samePin` when it applies; trailing IconButton `directions` (`common.directions`, Google Maps address query).
  - Empty: `kendras.none`.
  - No distance claims; operator names never shown.
- **PageNotes** (`stores`): `kendras.source`.

### `/check-bill`: focus mode, service name `nav.checkBill`
- **Data:** `getMedicineRefs()` only (unchanged).
- **Container:** `max-w-read`.
- **Above the fold:**
  1. H1 `bill.title` "Check a medicine bill".
  2. Lead `bill.lead`, which puts the scope first.
  3. InlineLink `bill.quoteLink` → `/check-quote`.
  4. Capture Card:
     - primary PhotoInput `bill.addPhoto` (no `capture`)
     - PrivacyNote `bill.privacy` beside it
     - footnote `bill.download`
     - plain Button `bill.typeInstead`
  5. ProgressBar during OCR (`medicines.scan.reading`, live).
- **Summary** (appears **above** the lines once at least one line is checked):
  - Card titled `bill.summaryHeading` with 3 StatTiles in `grid grid-cols-3 gap-2` (`grid-cols-1` below 360px): lines checked, above the ceiling (warn tone when > 0), possible saving.
  - If anything is above: Callout warn `bill.complain` + NPPA link.
  - Tonal ShareButton (`bill.shareText`).
- **Lines** (`space-y-3`), each a Card:
  - **Expanded** (default for new and OCR lines):
    - header `bill.lineN` + IconButton `trash` `bill.remove`
    - TextField `bill.colItem`
    - `grid grid-cols-2 gap-3`: TextField `bill.colQty` (numeric) and MoneyField `bill.colAmount`
    - ChoiceChip radios `bill.pickMatch` (never auto-picked); once picked: "`bill.matchedTo` {X}" + plain `bill.change`
    - StatusLine with `bill.label.*` + `bill.status.*`
    - footnote `bill.ceilingSource`; `bill.jaLine` + `bill.jaSaving`
    - inline Disclosure `common.details`: `bill.brandMrp` + `bill.brandCredit`
    - `bill.noMatch` / `bill.needQty` states
  - **Collapsed** (automatically after a pick, with an `bill.edit` button): `bill.lineN` · item (DataText) · "{qty} · ₹amount" · status Badge (above = warn; others neutral).
  - `checkUnits` is neutral, never a flag.
- **After the lines:** tonal `bill.addLine`, plain PhotoInput `bill.addPhoto` for another photo.
- **PageNotes** (`checks`): `bill.notChecked`, `bill.disclaimer`, `check.methodologyLink`.
- **Deleted:** the dark `bg-contrast` summary band, the row index column, the 32px ×, eyebrow, subtitle, the bottom-only scope note, `capture="environment"`.

### `/hospitals`: Find a hospital (server page)
- **Data:** the server passes the 6 city counts and the directory date. The 1.45 MB chunk is gone.
- **Container:** `max-w-read`.
- **Above the fold:**
  1. H1 `hospitals.title`.
  2. Lead `hospitals.lead` (computed counts, Bajaj Allianz attribution, "not a recommendation").
  3. Disclosure inline `hospitals.whatIsList`.
  4. `UniversalSearch variant="hero" scope="hospitals"` labelled `hospitals.searchLabel`. It fetches the hospital index on focus; result rows show name + city + PIN.
  5. InsetGroup `hospitals.chooseCity`: 6 rows, A–Z. Bangalore's subtitle is `hospitals.pricesAvailable`. Trailing count (tabular) + chevron.
- **PageNotes** (`hospitals`): SourceNote `source.directory` + date.
- **Deleted:** the hard-coded "2,684", the 6 bordered cards.

### `/hospitals/[city]`
- **Data:** the city's hospitals (as today) plus a server-computed `pricedSlugs` set (Bangalore only).
- **Container:** `max-w-page`.
- **Above the fold:**
  1. BackLink `nav.findHospital` → `/hospitals`.
  2. H1 `city.title`.
  3. Lead `city.subtitle`.
  4. TextField `city.searchLabel` (local filter).
  5. ChipRow: toggle ChoiceChip `city.filterPrices` (Bangalore only). There is no NABH filter (only 24 hospitals are flagged) and no ICU filter.
  6. Below 1024px: SegmentedControl `city.viewLabel` with `city.viewList` | `city.viewMap` (default List).
  7. Live footnote `city.showing` · `city.sortNote`.
- **List:**
  - One page-level InsetGroup with **no nested scroll**.
  - Rows: title name (DataText); subtitle address truncated to 1 line (`truncate`); meta `city.pin` · `city.beds` (from `cleanCount`; hidden when null); Badge accent `city.pricesBadge` when priced; chevron.
  - 50 rows first, then tonal `common.showMore`.
  - Empty: `city.noMatch`.
- **Map:**
  - Below 1024px it is mounted **only when Map is chosen**: `h-[70dvh] min-h-[360px]`.
  - From 1024px the layout splits: `lg:grid lg:grid-cols-12 lg:gap-6`. List `lg:col-span-5`; map `lg:col-span-7 lg:sticky lg:top-[72px] lg:h-[calc(100dvh-96px)] overflow-hidden rounded-card`. The map loads after `requestIdleCallback`.
  - Kept: `HospitalMapLoader` (next/dynamic, `ssr:false`), the ResizeObserver → `map.resize()`, an explicit height, and a visible fallback `city.mapFailed`; the list works without the map.
  - Popup per §5.5 (`city.viewHospital`).
- **PageNotes** (`hospitals`): SourceNote directory.
- **Deleted:** map-first stacking, the 520px nested-scroll list, the raw `networkType` badge in rows, `#2563eb`, `#dc2626`, `#ffffff`, hard-coded "beds" and "PIN".

### `/hospitals/[city]/[slug]`
- **Data:** server-passed props for reviews, procedures and kendras (unchanged invariant).
- **Container:** `max-w-read`.
- **Above the fold:**
  1. BackLink `hospital.backTo` → the city page.
  2. H1 name (DataText).
  3. Address `text-callout text-label-2` (DataText).
  4. Action row `flex gap-2`:
     - tonal ButtonLink `phone` `common.call` (`telHref`; **hidden when null**)
     - tonal ButtonLink `directions` `common.directions` (ExtLink `https://www.google.com/maps/search/?api=1&query={lat},{lon}`, or name + address + PIN when there are no coordinates)
  5. Start of the "About" group.
- **Sections:**
  1. **InsetGroup `hospital.about`:** rows only when not null: `hospital.bedCount` (cleanCount), `hospital.icuBeds` (cleanCount), `hospital.nabh` when `nabhFlag === "Y"`, `hospital.pincode`, `hospital.phone` (full string). Then an inline Disclosure `hospital.insuranceDetails`: `hospital.networkType`, `hospital.rohiniCode` (cleanCode) + `hospital.rohiniHint`. Never show "—".
  2. **Treatment prices (Bangalore gate unchanged):**
     - SectionHeader `hospital.proceduresHeading`.
     - ListRows: procedure name (link) / MoneyRange(min, max) / meta `procedure.typical`.
     - **New** SourceNote HexaHealth + `source.marketQualifier` + date.
     - ActionLink `hospital.checkQuote` → `/check-quote#{slug}` for single-procedure hospitals, otherwise `/check-quote`.
     - Bangalore but no linked prices: Callout info `hospital.noPricesHere` + ActionLink `hospital.seeUsual`.
     - **Other cities:** Callout info `hospital.noPricesCity`, with no link to Bangalore prices.
  3. **Reviews** (only when the prop is non-null; every legal element kept):
     - SectionHeader `reviews.heading`.
     - `hospital.ratingLine` (number first; stars `aria-hidden`).
     - ActionLink `reviews.viewOnGoogle`.
     - AI summary in a Callout info titled `reviews.summaryLabel` + `reviews.summaryDisclaimer`.
     - Hotlinked photo strip: `-mx-4 flex snap-x gap-2 overflow-x-auto px-4`, images `h-28 snap-start rounded-control`, `onError` drop kept.
     - Review Cards: author ExtLink to the profile; rating "4 of 5" + stars; date; text clamped to 6 lines (`line-clamp-6`) with a Disclosure `reviews.readMore`; ActionLink `reviews.viewReview` (44px).
     - Footnote `reviews.sourceDated`.
  4. **SectionHeader `hospital.kendrasHeading`:**
     - InsetGroups `hospital.kendrasSamePin` and `hospital.kendrasSameArea` (wording kept), using KendraRows as on `/kendras`.
     - ActionLinks `hospital.kendrasFindMore` and `hospital.kendrasMedicines`.
     - States `kendrasNone` / `kendrasNoPin` kept.
  5. Share row `hospital.shareHere` → `/share-bill` (no hospital prefill).
- **PageNotes** (`hospitals`): SourceNote directory.
- **Deleted:** the 6-cell `<dl>` with "—", the procedure table, the "browse Bangalore prices" link on other cities, `text-xs` review links.

### `/share-bill`: focus mode, service name `nav.shareBill`
- **Data:** the 61-row procedure list as props. The hospital index is **fetched** at step 2, which removes 2,684 names from the HTML.
- **Container:** `max-w-read`, `pb-28 md:pb-0`.
- **Intro (step 0):**
  1. H1 `share.title`.
  2. Lead `share.subtitle`.
  3. Static InsetGroup with the 3 promises: `lock` `share.promiseNoLogin`, `users` `share.promiseNoName`, `hospital` `share.promiseHospital`.
  4. Footnote `share.duration`.
  5. When `!BILL_SHARING_ENABLED`: Callout warn `share.notOpen`, and the primary button reads `share.closedButton` and is **disabled**.
  6. Otherwise StickyActionBar primary `share.start`.
  7. Below the action: **PatientReported** with heading `share.stats.heading`:
     - `share.stats.rule`
     - StatTile `share.stats.approved`
     - unlocked rows "{procedure} · {city}" with the median (`text-title3`) and "Middle half ₹p25–₹p75 · `share.stats.bills`"
     - progress lines `share.stats.progress`
     - `share.stats.unverified`
     - or `share.stats.none`
  
  There is no hospital dimension, ever. Stats appear **only** here.
- **Question screens:** StepHeader ("Step n of 6"), then H1 = the question (legend via `legendAsH1`), then fields, then StickyActionBar `share.continue`. Each step calls `history.pushState({step}, "", "#step-n")` and handles `popstate`, so the Android back button returns to the previous question. The draft lives in `sessionStorage["medcost-share-draft"]` and is cleared on submit and on done.
  1. `share.stepQ.what`: Combobox (`share.q.procedure`, hint `share.q.procedureHint`) with footer option `share.q.procedureOther`. Category is **derived** from `PROCEDURE_GROUP[slug].shareCategory` and shown as `share.kindPrefilled` + `common.change`. The 13-category ChoiceList appears only for "Not in this list" (with the text field `share.q.procedureOtherPlaceholder`).
  2. `share.stepQ.where`:
     - ChoiceList `share.q.city` (6 cities + `share.q.cityOther` with reveal).
     - Combobox `share.q.hospital` (optional; hint `share.q.hospitalHint`), fed by the fetched index filtered by city; `share.q.hospitalNotListed`.
     - ChoiceList `share.q.hospitalType`.
  3. `share.stepQ.stay`:
     - Selects `share.q.month` (month + year).
     - ChoiceList `share.q.admitted` (hint `admittedHint`). Yes reveals `stayDays`, `icuDays` and the ChoiceList `roomType`.
     - ChoiceList `complications` (includes "Not sure").
  4. `share.stepQ.money`: ChoiceList `share.q.payment` (7); MoneyFields `quoted` / `final` / `covered` with their existing hints.
  5. `share.stepQ.breakdown` (optional): 9 MoneyFields `share.component.*`, the running sum `componentsSum` (tabular), the surprises repeater (`share.q.surprises`, `share.q.addSurprise`, IconButton `trash` `share.removeCharge`), plain `share.skip`.
  6. `share.stepQ.review`:
     - InsetGroup with `share.review.*` rows, each with a `common.change` link back to its step.
     - The hospital row is labelled `share.review.hospital` "Hospital (private)".
     - ChoiceList checkbox (56px row) with `share.consent` verbatim.
     - Primary `share.submit` (`share.sending` while busy).
- **Errors:** ErrorSummary at the top (focused) + inline messages (`share.err.*`). `Field` becomes a real `<label>` or `<legend>`. Kept: `share.submitError.*`, rate limits, `browser_id`, typed-only amounts.
- **Done:**
  - `check-circle` `size-12 text-success-icon`
  - H1 `share.done.title`
  - body `share.done.body`
  - Card with `share.done.receipt` + ID `text-title3 tabular-nums select-all`
  - tonal ShareButton (`share.done.shareText`)
  - ActionLinks `share.done.checkMedicines` → `/check-bill` and `share.done.home` → `/`
- **PageNotes** (`patient-bills`) on the intro.
- **Deleted:** eyebrow, the 5-segment unlabelled stepper, category pills on step 1, stats under the form, "Next →", `<div>` labels, the 2,684-name prop, `accent-[var(--brand-600)]`.

### `/methodology`: How we get prices
- **Container:** `max-w-read`.
- **Above the fold:**
  1. BackLink `nav.home` → `/`.
  2. H1 `methodology.title`.
  3. Lead `methodology.intro`.
  4. Card `methodology.shortHeading` with 3 bullets `short1–3`.
  5. InsetGroup `methodology.onThisPage` with anchor rows (56px).
- **Sections** (H2 `text-title2` with `id`; body `text-body text-label` at 65ch). **All existing paragraphs are kept verbatim**, except the two edits in §8:
  - `#market-prices` (marketHeading, marketBody1–2)
  - `#govt-rates` (govHeading, govBody1–2)
  - `#medicines` (medHeading, medBody1–2, licences intact, CDCI credit)
  - `#stores` (`storesHeading`, medBody3)
  - `#checks` (checkHeading, checkBody1–2)
  - `#patient-bills` (**new**)
  - `#hospitals` (dirHeading, dirBody)
  - `#reviews` (**new**)
  - `#dates` (**new**)
  - `#corrections` (correctionsHeading, correctionsBody)
  - `#next` (nextHeading, nextBody)
- **Corrections link:** `methodology.correctionsLink` → `https://github.com/anshuljain15/medcost-india/issues` ships **only after the owner confirms that the repo is public and Issues is enabled**. Until then `correctionsBody` stays as it is today, with no link.

### 404: `app/not-found.tsx` (new, client, uses `t()`; static export still emits `404.html`)
- The normal chrome renders around it (root layout).
- `PageShell read`: H1 `notFound.title`, body `notFound.body`, then an InsetGroup with Home, Treatment costs, Medicines, Hospitals (icons as in the tabs), then plain ButtonLink `notFound.home`.

---

## 7. Header and footer anatomy

**SkipLink** (the first focusable element):
`sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[60] focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-full focus:bg-elevated focus:px-5 focus:text-headline focus:text-label focus:shadow-pop` → `#main`, text `nav.skip`.

**SiteHeader** (client; `usePathname()`; an IntersectionObserver on a 1px sentinel at the top of the body sets `data-scrolled`):
```
<header id="site-header" data-scrolled class="sticky top-0 z-40 border-b border-transparent bg-canvas data-[scrolled=true]:border-hairline">
  <div class="mx-auto flex h-14 max-w-page items-center gap-2 px-4 md:px-6">
    <Logo/>  → <Link href="/" aria-label={t('nav.homeLink')} class="-ml-1 flex min-h-11 items-center gap-2 rounded-control px-1 text-headline text-label">
               <span class="grid size-7 place-items-center rounded-lg bg-accent text-accent-fg">[range glyph]</span>
               <span aria-hidden>MedCost India</span>
    <nav aria-label={t('nav.mainLabel')} class="ml-4 hidden md:flex md:gap-1">
      3 × <Link aria-current={ariaCurrent(...)} data-active={…||undefined}
            class="inline-flex min-h-11 items-center rounded-full px-4 text-callout font-medium text-label-2 transition-colors duration-150 hover:text-label data-active:bg-fill data-active:font-semibold data-active:text-label">
    <div class="ml-auto flex items-center gap-1">
      {pathname !== "/" && <>
        <IconButton icon="search" label={t('nav.search')} class="lg:hidden" onClick={openSheet}/>
        <button class="hidden lg:inline-flex h-11 w-64 items-center gap-2 rounded-full border border-control bg-surface px-4 text-callout text-label-2 transition-colors duration-150 hover:bg-fill">
          <Icon name="search" class="size-5"/><span class="truncate">{t('nav.searchButton')}</span></button></>}
      <LanguageSwitch/>
```
- **Focus variant:**
  - the logo shows the mark only below `md`
  - `<span class="mx-2 h-6 w-px bg-hairline" aria-hidden/>`
  - `<span class="min-w-0 truncate text-headline text-label">{service}</span>`
  - `ml-auto` LanguageSwitch
  - `<IconButton icon="x" href={closeHref} label={t('nav.close',{section})}/>`
  - no nav, no search
- **Deleted:** the Share pill, ThemeToggle, the hamburger and mobile menu, `bg-surface/95 backdrop-blur`, English `aria-label`s.

**TabBar** (client; rendered only outside FOCUS_ROUTES):
```
<nav aria-label={t('nav.tabsLabel')} data-tabbar class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
  4 × <Link aria-current data-active class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption text-label-2 data-active:text-accent">
        <Icon name class="size-6"/><span>{t(tabKey)}</span>
```
Tabs: Home (`home`) · Treatment (`clipboard`) · Medicines (`pill`) · Hospitals (`hospital`). The active tab gets the accent colour **and** `aria-current`, not colour alone, because the active label is also semibold through `text-caption` weight plus the current state.

**SiteFooter** (`id="site-footer"`):
```
<footer class="mt-16 border-t border-hairline bg-canvas">
  <div class="mx-auto max-w-page px-4 py-10 md:px-6 text-callout text-label-2">
    Row 1  Logo (mark + "MedCost India", text-headline text-label) · <p class="mt-3 max-w-[52ch]">{footer.tagline}</p>   ← must-keep promise
    Row 2  <div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
             headings: <h2 class="text-footnote font-semibold text-label">; links: "flex min-h-11 items-center hover:text-label hover:underline underline-offset-4"
             footer.colTreatment: nav.procedures /procedures · nav.checkQuote /check-quote · nav.rates /rates
             footer.colMedicines: nav.searchMedicines /medicines · nav.checkBill /check-bill · nav.kendras /kendras
             footer.colHospitals: nav.findHospital /hospitals · Bangalore · Delhi · Mumbai · Chennai · Hyderabad · Pune (city names are data text)
             footer.colAbout:     nav.methodology /methodology · nav.shareBill /share-bill · nav.reportMistake /methodology#corrections · footer.credit (ExtLink, kept)
    Row 3  <div class="mt-8 max-w-xs"><ThemeSwitch/></div>   (legend footer.appearance: theme.system / theme.light / theme.dark)
    Row 4  <div class="mt-8 space-y-2 border-t border-hairline pt-6 text-footnote">
             footer.notAdvice · footer.emergency · footer.licence
```
- **Focus routes:** `py-6` with Row 4 plus InlineLink `nav.methodology` only.

---

## 8. Translation keys (`lib/i18n/translations.ts`, both `en` and `hi`)

General rules for the copy:
- Remove every arrow (→ ← ▸) from every string; chevrons are icons now.
- Hindi uses everyday spoken words: इलाज, not प्रक्रिया; कीमत, not मूल्य; दायरा/रेंज for a range, never सीमा.
- Data text is never translated.
- Phase 0 adds **every key below in one commit**. Page streams only consume keys.
- `LOCALES` gets the `name` field (§5.5).

### 8.1 Changed existing values
| Key | en | hi |
|---|---|---|
| nav.medicines | Medicines | दवाइयाँ |
| nav.procedures | Treatment prices in Bangalore | बैंगलोर में इलाज की कीमतें |
| nav.checkQuote | Check a hospital quote or bill | अस्पताल का कोटेशन या बिल जाँचें |
| nav.checkBill | Check a medicine bill | दवा का बिल जाँचें |
| nav.kendras | Find a Jan Aushadhi store | जन औषधि केंद्र खोजें |
| nav.rates | Govt (CGHS) rates | सरकारी (CGHS) दरें |
| nav.methodology | How we get prices | हम कीमतें कहाँ से लेते हैं |
| footer.tagline (hi only) | (unchanged) | इस साइट पर हर कीमत एक दायरा (रेंज) है, जिसका स्रोत और तारीख साफ़ लिखी है — कभी भी कोई मनगढ़ंत संख्या नहीं। |
| home.howWeWork | How we get prices | हम कीमतें कहाँ से लेते हैं |
| procedures.title | Treatment costs in Bangalore | बैंगलोर में इलाज का खर्च |
| procedures.filterPlaceholder | e.g. knee, cataract, hernia | जैसे घुटना, मोतियाबिंद, हर्निया |
| procedure.back | Treatment costs | इलाज का खर्च |
| procedure.marketRange | Market estimate | बाज़ार अनुमान |
| procedure.checkQuote | Check a quote or bill for this | इसका कोटेशन या बिल जाँचें |
| procedure.noCghsMatch | No confident government (CGHS) match for this treatment. We only show one when we're sure it is the same treatment. | इस इलाज के लिए कोई पक्का सरकारी (CGHS) मिलान नहीं है। हम मिलान तभी दिखाते हैं जब हमें यकीन हो कि यह वही इलाज है। |
| rates.title | Govt (CGHS) rates | सरकारी (CGHS) दरें |
| rates.subtitle | {n} line items across {m} specialties from the Central Government Health Scheme list, Tier I (Bangalore). This is what the government pays hospitals, not necessarily what a private hospital charges. | केंद्र सरकार स्वास्थ्य योजना (CGHS) की सूची से {m} विशेषज्ञताओं में {n} मद, टियर I (बैंगलोर)। यह वह रकम है जो सरकार अस्पतालों को देती है; ज़रूरी नहीं कि निजी अस्पताल भी इतना ही लें। |
| rates.searchPlaceholder | e.g. knee replacement or a CGHS code | जैसे knee replacement या कोई CGHS कोड |
| hospitals.title | Find a hospital | अस्पताल खोजें |
| hospital.backTo | Hospitals in {city} | {city} के अस्पताल |
| hospital.networkType | Insurance network type | बीमा नेटवर्क का प्रकार |
| hospital.proceduresHeading | Treatment prices at this hospital | इस अस्पताल में इलाज की कीमतें |
| hospital.kendrasFindMore / kendrasMedicines | (remove arrows only) | (remove arrows only) |
| medicines.title | Find a cheaper medicine | सस्ती दवा खोजें |
| medicines.back | Medicines | दवाइयाँ |
| medicines.findKendra | Find a Jan Aushadhi store | जन औषधि केंद्र खोजें |
| medicines.nppaHeading | Legal ceiling price (NPPA) | क़ानूनी अधिकतम कीमत (NPPA) |
| medicines.scan.button | Read names from a photo | फ़ोटो से नाम पढ़ें |
| kendras.search | Find stores | केंद्र खोजें |
| kendras.invalidPin | Enter a 6-digit PIN code, like 560034. | 6 अंकों का पिन कोड लिखें, जैसे 560034। |
| kendras.source | Source: PMBJP Kendra list, {date} ({n} stores in our data). | स्रोत: PMBJP केंद्र सूची, {date} (हमारे डेटा में {n} केंद्र)। |
| quote.title | Check a hospital quote or bill | अस्पताल का कोटेशन या बिल जाँचें |
| quote.procedureLabel | Which treatment? | कौन-सा इलाज? |
| quote.amountLabel | How much did the hospital quote? | अस्पताल ने कितनी रकम बताई? |
| quote.wardLabel | Which room is the price for? | यह कीमत किस कमरे के लिए है? |
| quote.verdict.below | This amount is below the lowest market estimate we have for {proc}. | यह रकम {proc} के लिए हमारे सबसे कम बाज़ार अनुमान से भी कम है। |
| quote.verdict.lowerHalf | This amount is in the lower half of the market estimate for {proc}. | यह रकम {proc} के बाज़ार अनुमान के दायरे के निचले आधे हिस्से में है। |
| quote.verdict.upperHalf | This amount is in the upper half of the market estimate for {proc}. | यह रकम {proc} के बाज़ार अनुमान के दायरे के ऊपरी आधे हिस्से में है। |
| quote.verdict.above | This amount is above the highest market estimate we have for {proc}. | यह रकम {proc} के लिए हमारे सबसे ऊँचे बाज़ार अनुमान से भी ज़्यादा है। |
| quote.seeHospitals | See prices at each hospital | हर अस्पताल की कीमत देखें |
| quote.hospitalsBelow | {below} of {n} hospitals list a typical price below this amount. | {n} में से {below} अस्पतालों की आम कीमत इस रकम से कम है। |
| quote.cghsMultiple | Your amount is {x}× the CGHS {ward} rate of {rate}. | आपकी रकम CGHS की {ward} दर {rate} की {x} गुना है। |
| bill.title | Check a medicine bill | दवा का बिल जाँचें |
| bill.addLine | Add a line | एक लाइन जोड़ें |
| bill.remove | Remove line {n} | लाइन {n} हटाएँ |
| bill.change | Change | बदलें |
| bill.quoteLink | Check a hospital quote or bill | अस्पताल का कोटेशन या बिल जाँचें |
| share.back | Back | वापस |
| share.skip | Skip this step | यह चरण छोड़ें |
| share.q.addSurprise | Add a charge | एक चार्ज जोड़ें |
| share.done.checkMedicines | Check the medicines on your bill | अपने बिल की दवाइयाँ जाँचें |
| methodology.title | How we get prices | हम कीमतें कहाँ से लेते हैं |
| methodology.intro (hi only) | (unchanged) | replace "हर संख्या एक सीमा है" with "हर संख्या एक दायरा (रेंज) है"; the rest is verbatim |
| methodology.govBody1 | replace the opening "The Rate Explorer and every procedure page’s “CGHS reference” figure comes" with "The Govt (CGHS) rates page and the “Govt (CGHS) rate” on every treatment page come"; the rest is verbatim | replace "रेट एक्सप्लोरर और हर प्रक्रिया पृष्ठ का “CGHS संदर्भ” आंकड़ा सीधे" … "आता है" with "सरकारी (CGHS) दरें पेज और हर इलाज पेज पर दिखी “सरकारी (CGHS) दर” सीधे" … "आती है"; the rest is verbatim |

### 8.2 New keys
| Key | en | hi |
|---|---|---|
| nav.home | Home | होम |
| nav.treatment | Treatment costs | इलाज का खर्च |
| nav.checkQuoteShort | Check a quote or bill | कोटेशन या बिल जाँचें |
| nav.findMedicine | Find a cheaper medicine | सस्ती दवा खोजें |
| nav.searchMedicines | Search medicines | दवाइयाँ खोजें |
| nav.findHospital | Find a hospital | अस्पताल खोजें |
| nav.reportMistake | Report a wrong price | ग़लत कीमत बताएँ |
| nav.search | Search | खोजें |
| nav.searchButton | Search treatments, medicines, hospitals | इलाज, दवा या अस्पताल खोजें |
| nav.mainLabel | Main | मुख्य |
| nav.tabsLabel | Sections | सेक्शन |
| nav.skip | Skip to main content | सीधे मुख्य हिस्से पर जाएँ |
| nav.backTo | Back to {page} | {page} पर वापस |
| nav.close | Close and go back to {section} | बंद करें और {section} पर लौटें |
| nav.homeLink | MedCost India home | MedCost India होम |
| nav.languageSwitch | Change language: | भाषा बदलें: |
| tab.home / tab.treatment / tab.medicines / tab.hospitals | Home / Treatment / Medicines / Hospitals | होम / इलाज / दवाइयाँ / अस्पताल |
| common.showMore | Show {n} more | {n} और दिखाएँ |
| common.showAll | Show all {n} | सभी {n} दिखाएँ |
| common.change | Change | बदलें |
| common.details | Details | विवरण |
| common.call | Call | कॉल करें |
| common.directions | Directions | रास्ता देखें |
| common.newTab | (opens in a new tab) | (नए टैब में खुलता है) |
| common.notListed | Not listed | सूची में नहीं |
| common.lakhRange | about ₹{low}–{high} lakh | लगभग ₹{low}–{high} लाख |
| common.croreRange | about ₹{low}–{high} crore | लगभग ₹{low}–{high} करोड़ |
| common.lakhOne / common.croreOne | ₹{n} lakh / ₹{n} crore | ₹{n} लाख / ₹{n} करोड़ |
| common.close | Close | बंद करें |
| common.sourcesNotes | Sources and notes | स्रोत और नोट्स |
| source.label | Source: | स्रोत: |
| source.retrieved | retrieved {date} | {date} को लिया गया |
| source.noDate | date not recorded | तारीख दर्ज नहीं |
| source.howWeGet | How we get prices | हम कीमतें कहाँ से लेते हैं |
| source.marketQualifier | Market estimate, not a bill | बाज़ार अनुमान, असली बिल नहीं |
| source.cghs | CGHS rate list, Tier I | CGHS दर सूची, टियर I |
| source.directory | Bajaj Allianz cashless network list | Bajaj Allianz कैशलेस नेटवर्क सूची |
| source.patientLabel | Reported by patients · not verified | मरीज़ों द्वारा बताया गया · जाँचा नहीं गया |
| source.patientCount | {n} bills | {n} बिल |
| search.label | Search a treatment, medicine or hospital | इलाज, दवा या अस्पताल खोजें |
| search.placeholder | e.g. knee replacement or Dolo 650 | जैसे घुटना बदलना या Dolo 650 |
| search.try | Try: | आज़माएँ: |
| search.tryChips | ["Knee replacement","Cataract","Dolo 650"] | ["घुटना बदलना","मोतियाबिंद","Dolo 650"] |
| search.groupTreatments | Treatments · Bangalore prices | इलाज · बैंगलोर की कीमतें |
| search.groupMedicines | Medicines | दवाइयाँ |
| search.groupHospitals | Hospitals | अस्पताल |
| search.groupPages | Tools and pages | टूल और पेज |
| search.treatmentsSource | Market estimates from HexaHealth · {date} | HexaHealth के बाज़ार अनुमान · {date} |
| search.medicinesSource | Jan Aushadhi prices from the PMBJP list, {date} | PMBJP सूची से जन औषधि कीमतें, {date} |
| search.count | {n} results | {n} नतीजे |
| search.none | Nothing found for “{q}”. Try a simpler word, like “knee” or “paracetamol”. | “{q}” के लिए कुछ नहीं मिला। कोई आसान शब्द लिखें, जैसे “घुटना” या “paracetamol”। |
| search.medicinesMin | Type at least 3 letters of the medicine name in English. | दवा का नाम अंग्रेज़ी अक्षरों में, कम से कम 3 अक्षर लिखें। |
| search.pinRow | Jan Aushadhi stores for PIN {pin} | पिन {pin} के जन औषधि केंद्र |
| search.seeAllMedicines | See all medicines matching “{q}” | “{q}” से मिलती सभी दवाइयाँ देखें |
| search.clear | Clear search | खोज मिटाएँ |
| search.close | Close search | खोज बंद करें |
| home.lead | Check what a hospital or pharmacy is charging against public prices, each with its source and date. | अस्पताल या दवा की दुकान जो पैसे ले रही है, उसे सार्वजनिक कीमतों से मिलाएँ। हर कीमत के साथ उसका स्रोत और तारीख है। |
| home.tasksHeading | What do you want to do? | आप क्या करना चाहते हैं? |
| home.tileQuoteBody | Compare it with market estimates for Bangalore. | इसे बैंगलोर के बाज़ार अनुमानों से मिलाएँ। |
| home.tileBillBody | We check each tablet against the government ceiling price. | हम हर गोली को सरकार की तय अधिकतम कीमत से मिलाते हैं। |
| home.tileMedicineBody | The Jan Aushadhi generic with the same salt and strength. | वही साल्ट और वही ताकत वाली जन औषधि जेनेरिक दवा। |
| home.moreHeading | More from MedCost | MedCost पर और भी |
| home.moreHospitalsSub | {h} hospitals in {c} cities | {c} शहरों के {h} अस्पताल |
| home.moreKendrasSub | Search by PIN code | पिन कोड से खोजें |
| home.moreRatesSub | What the government pays hospitals | सरकार अस्पतालों को कितना देती है |
| home.moreMethodSub | Sources, dates and limits | स्रोत, तारीखें और हमारी कमियाँ |
| home.shareBody | Share it anonymously. It helps the next family. | बिना नाम के साझा करें। इससे अगले परिवार को मदद मिलती है। |
| home.coverage | {p} treatments priced in Bangalore · {m} medicines · {h} hospitals in {c} cities | बैंगलोर में {p} इलाजों की कीमतें · {m} दवाइयाँ · {c} शहरों में {h} अस्पताल |
| procedures.filterLabel | Find a treatment | इलाज खोजें |
| procedures.quoteTileBody | Got a quote or a final bill? See where it sits. | कोटेशन या अंतिम बिल मिला है? देखें कि वह कहाँ आता है। |
| procedures.count | {n} treatments | {n} इलाज |
| procedures.rowMeta | {n} hospital prices | {n} अस्पतालों की कीमतें |
| procedures.govRate | Govt rate | सरकारी दर |
| procedures.ratesLink | Govt (CGHS) rates for {n} line items | {n} मदों की सरकारी (CGHS) दरें |
| procedures.group.heart / bones / eye / stomach | Heart / Bones and joints / Eye / Stomach and liver | दिल / हड्डी और जोड़ / आँख / पेट और लिवर |
| procedures.group.weightLoss / women / kidney / cancer | Weight loss / Women's health / Kidney and urology / Cancer | वज़न घटाना / महिलाओं का स्वास्थ्य / किडनी और मूत्र रोग / कैंसर |
| procedures.group.general / entLungs / cosmetic / other | General surgery / Ear, nose, throat and lungs / Cosmetic surgery / Other treatments | सामान्य सर्जरी / कान, नाक, गला और फेफड़े / कॉस्मेटिक सर्जरी / अन्य इलाज |
| procedure.meta / metaNoHospitals | Bangalore · {n} hospital prices / Bangalore | बैंगलोर · {n} अस्पतालों की कीमतें / बैंगलोर |
| procedure.govHeading | Govt (CGHS) rate | सरकारी (CGHS) दर |
| procedure.govTier | Tier I · NABH | टियर I · NABH |
| procedure.cghsWhat | What is the CGHS rate? | CGHS दर क्या है? |
| procedure.howWeMatch | How we match | हम मिलान कैसे करते हैं |
| procedure.hospitalsHeading | Prices at {n} hospitals | {n} अस्पतालों में कीमतें |
| procedure.sortNote | Lowest typical price first. | सबसे कम आम कीमत पहले। |
| procedure.typical | Typical {avg} | आम तौर पर {avg} |
| procedure.showAllHospitals | Show all {n} hospitals | सभी {n} अस्पताल दिखाएँ |
| procedure.unlinkedNote | Hospitals without a link couldn't be matched to our directory with certainty, so we don't guess. | जिन अस्पतालों पर लिंक नहीं है, उन्हें हमारी सूची से पक्के तौर पर मिलाया नहीं जा सका, इसलिए हम अंदाज़ा नहीं लगाते। |
| procedure.askHeading | What to ask the hospital | अस्पताल से क्या पूछें |
| procedure.shareRow | Had this treatment? Share your bill | यह इलाज हुआ है? अपना बिल साझा करें |
| quote.lead | For treatments in Bangalore. Takes about a minute. | बैंगलोर में होने वाले इलाज के लिए। लगभग एक मिनट लगता है। |
| quote.kindLabel | What do you have? | आपके पास क्या है? |
| quote.kind.quote / quote.kind.bill | A quote / A final bill | कोटेशन / अंतिम बिल |
| quote.procedureSearch | Type to search, e.g. knee | खोजने के लिए लिखें, जैसे घुटना |
| quote.notListed | My treatment isn't in this list | मेरा इलाज इस सूची में नहीं है |
| quote.notListedBody | We only have prices for these treatments so far. You can still share your bill to help others. | अभी हमारे पास सिर्फ़ इन्हीं इलाजों की कीमतें हैं। दूसरों की मदद के लिए आप फिर भी अपना बिल साझा कर सकते हैं। |
| quote.amountLabelBill | How much was the final bill? | अंतिम बिल कितने का था? |
| quote.amountHint | The total for the whole treatment, in rupees. | पूरे इलाज की कुल रकम, रुपयों में। |
| quote.ward.notSure | Not sure | पक्का नहीं पता |
| quote.submit / quote.submitBill | Check this quote / Check this bill | यह कोटेशन जाँचें / यह बिल जाँचें |
| quote.status.within | Within the market estimate | बाज़ार अनुमान के दायरे में |
| quote.status.above | Above the market estimate | बाज़ार अनुमान से ज़्यादा |
| quote.status.below | Below the market estimate | बाज़ार अनुमान से कम |
| quote.status.unknown | No market estimate yet | अभी कोई बाज़ार अनुमान नहीं |
| quote.yourAmount | Yours: {amount} | आपकी रकम: {amount} |
| quote.rangeAria | Your amount {amount}, compared with the market estimate of {low} to {high}. | आपकी रकम {amount}, बाज़ार अनुमान {low} से {high} की तुलना में। |
| quote.lowEnd / quote.highEnd | Lowest estimate / Highest estimate | सबसे कम अनुमान / सबसे ऊँचा अनुमान |
| quote.whatToDo | What you can do | आप क्या कर सकते हैं |
| quote.belowTip | Ask what this price leaves out, such as implants, medicines or extra days. | पूछें कि इस कीमत में क्या शामिल नहीं है, जैसे इम्प्लांट, दवाइयाँ या ज़्यादा दिन। |
| quote.askHeadingBill | Ask the hospital for an explanation | अस्पताल से साफ़ जानकारी माँगें |
| quote.askListBill[0] | Ask for an itemised final bill, with room, doctor fees, implants, medicines, consumables and tests listed separately. | मदवार अंतिम बिल माँगें, जिसमें कमरा, डॉक्टर की फ़ीस, इम्प्लांट, दवाइयाँ, सामान और जाँचें अलग-अलग लिखी हों। |
| quote.askListBill[1] | Compare it line by line with the estimate you were given before admission. | इसे भर्ती से पहले मिले अनुमान से लाइन-दर-लाइन मिलाएँ। |
| quote.askListBill[2] | Ask which room type the charges were based on, and how many ICU days were billed. | पूछें कि चार्ज किस तरह के कमरे के हिसाब से लगे, और ICU के कितने दिन जोड़े गए। |
| quote.askListBill[3] | If insurance or a scheme paid part, ask for the settlement letter showing what it covered. | अगर बीमा या किसी योजना ने कुछ हिस्सा दिया, तो सेटलमेंट पत्र माँगें जिसमें लिखा हो कि क्या कवर हुआ। |
| quote.rightsHeading | Your right to know | जानने का आपका हक़ |
| quote.askDisclosure | What to ask the hospital before you agree | हामी भरने से पहले अस्पताल से क्या पूछें |
| quote.cghsPickRoom | Pick a room type above to compare your amount with the CGHS rate. | CGHS दर से तुलना के लिए ऊपर कमरे का प्रकार चुनें। |
| quote.shareTextBill | My hospital bill for {proc} was {quote}. The Bangalore market estimate is {low} – {high}. I checked it on MedCost India. | {proc} के लिए मेरे अस्पताल का बिल {quote} था। बैंगलोर का बाज़ार अनुमान {low} – {high} है। मैंने इसे MedCost India पर जाँचा। |
| quote.again | Check another amount | दूसरी रकम जाँचें |
| quote.sharePaid | Paid already? Share your bill | बिल चुका दिया? अपना बिल साझा करें |
| bill.lead | For tablets and capsules on a pharmacy or hospital bill. Room, test and procedure charges aren't checked here. | फ़ार्मेसी या अस्पताल के बिल पर गोलियों और कैप्सूल के लिए। कमरे, जाँच और इलाज के चार्ज यहाँ नहीं जाँचे जाते। |
| bill.addPhoto | Add a photo of the bill | बिल की फ़ोटो जोड़ें |
| bill.typeInstead | Type the lines instead | लाइनें खुद लिखें |
| bill.download | The first photo downloads a text reader of a few MB. Wi-Fi helps. | पहली फ़ोटो पर कुछ MB का टेक्स्ट रीडर डाउनलोड होता है। Wi-Fi हो तो बेहतर। |
| bill.lineN | Line {n} | लाइन {n} |
| bill.edit | Edit | बदलें |
| bill.label.above | Above the legal ceiling | क़ानूनी अधिकतम कीमत से ज़्यादा |
| bill.label.within | Within the legal ceiling | क़ानूनी अधिकतम कीमत के भीतर |
| bill.label.noCeiling | No legal ceiling | कोई क़ानूनी अधिकतम कीमत नहीं |
| bill.label.checkUnits | Check the quantity | मात्रा जाँचें |
| bill.label.pick | Pick the medicine | दवा चुनें |
| bill.brandCredit | Brand MRP: {name}, {date} ({license}). | ब्रांड MRP: {name}, {date} ({license})। |
| medicines.lead | Search a brand or salt. We show the government Jan Aushadhi generic with exactly the same salt, strength and form, and the legal ceiling price. | ब्रांड या साल्ट का नाम लिखें। हम ठीक वही साल्ट, ताकत और रूप वाली सरकारी जन औषधि जेनेरिक दवा, और क़ानूनी अधिकतम कीमत दिखाते हैं। |
| medicines.searchLabel | Search a brand or salt | ब्रांड या साल्ट का नाम खोजें |
| medicines.toolsHeading | Medicine tools | दवा से जुड़े टूल |
| medicines.brandsCredit | Brand MRPs: {name}, {date} ({license}). | ब्रांड MRP: {name}, {date} ({license})। |
| medicines.badgeNppa / badgeJa | NPPA ceiling applies / Jan Aushadhi generic available | NPPA अधिकतम कीमत लागू / जन औषधि जेनेरिक उपलब्ध |
| medicines.pricePerUnit | Price per {unit} | प्रति {unit} कीमत |
| medicines.typicalBrand | Typical brand (median, Nov 2022) | आम ब्रांड (मध्य कीमत, नवंबर 2022) |
| medicines.for30.tablet | For 30 tablets: {ja} instead of {brand} | 30 गोलियों के लिए: {brand} की जगह {ja} |
| medicines.for30.capsule | For 30 capsules: {ja} instead of {brand} | 30 कैप्सूल के लिए: {brand} की जगह {ja} |
| medicines.lessPct | About {pct}% less | लगभग {pct}% कम |
| medicines.same.salt / strength / form | Same salt / Same strength / Same form | वही साल्ट / वही ताकत / वही रूप |
| medicines.timesGeneric / morePct | {x}× the generic / {pct}% more than the generic | जेनेरिक का {x} गुना / जेनेरिक से {pct}% ज़्यादा |
| medicines.buyHeading | Buy it at a Jan Aushadhi store | जन औषधि केंद्र से खरीदें |
| medicines.seeAllStores | See all stores in {area}xxx | {area}xxx के सभी केंद्र देखें |
| medicines.showAllBrands | Show all {n} brands | सभी {n} ब्रांड दिखाएँ |
| medicines.relatedHeading | Similar, but different medicines | मिलती-जुलती, पर अलग दवाइयाँ |
| medicines.jaDetails | Jan Aushadhi product details | जन औषधि दवा की जानकारी |
| kendras.lead | Government stores that sell generic medicines at fixed low prices. | सरकारी दुकानें, जहाँ जेनेरिक दवाइयाँ तय और कम कीमत पर मिलती हैं। |
| kendras.pinLabel | Your PIN code | आपका पिन कोड |
| kendras.pinHint | The 6-digit number at the end of your postal address. | आपके डाक पते के आख़िर में लिखा 6 अंकों का नंबर। |
| kendras.beforeTravel | Before you travel | जाने से पहले |
| kendras.verify | Store details change. Check the official store locator before you travel. | केंद्रों की जानकारी बदलती रहती है। जाने से पहले सरकारी स्टोर लोकेटर में जाँच लें। |
| kendras.storeCode | Store code {code} | केंद्र कोड {code} |
| hospitals.lead | {n} hospitals in {c} cities, from the Bajaj Allianz cashless network list. Being listed is not a recommendation. | Bajaj Allianz की कैशलेस नेटवर्क सूची से, {c} शहरों के {n} अस्पताल। सूची में होना कोई सिफ़ारिश नहीं है। |
| hospitals.whatIsList | What is this list? | यह सूची क्या है? |
| hospitals.whatIsListBody | These are hospitals where Bajaj Allianz health insurance offers cashless treatment. Anyone can be treated at them; we use the list for names and addresses. | ये वे अस्पताल हैं जहाँ Bajaj Allianz स्वास्थ्य बीमा में कैशलेस इलाज मिलता है। इलाज कोई भी करा सकता है; हम यह सूची सिर्फ़ नाम और पते के लिए इस्तेमाल करते हैं। |
| hospitals.searchLabel | Find a hospital by name or PIN | नाम या पिन कोड से अस्पताल खोजें |
| hospitals.chooseCity | Choose a city | शहर चुनें |
| hospitals.pricesAvailable | Treatment prices available | इलाज की कीमतें उपलब्ध |
| city.title | Hospitals in {city} | {city} के अस्पताल |
| city.searchLabel | Search by name, area or PIN | नाम, इलाके या पिन कोड से खोजें |
| city.viewLabel / viewList / viewMap | Show as / List / Map | ऐसे दिखाएँ / सूची / नक्शा |
| city.filterPrices | Has treatment prices | इलाज की कीमतें हैं |
| city.showing | Showing {shown} of {total} | {total} में से {shown} दिख रहे हैं |
| city.sortNote | Sorted A to Z | A से Z के क्रम में |
| city.beds / city.pin | {n} beds / PIN {pin} | {n} बेड / पिन {pin} |
| city.pricesBadge | Prices | कीमतें |
| city.mapLoading | Loading map… | नक्शा लोड हो रहा है… |
| city.mapFailed | The map couldn't load on this device. The list still works. | इस डिवाइस पर नक्शा नहीं खुल सका। सूची फिर भी काम करती है। |
| city.viewHospital | View hospital | अस्पताल देखें |
| hospital.about | About this hospital | इस अस्पताल के बारे में |
| hospital.nabh | NABH accredited (as listed) | NABH मान्यता (सूची के अनुसार) |
| hospital.insuranceDetails | Insurance details | बीमा की जानकारी |
| hospital.rohiniHint | An ID insurers use for hospitals. | बीमा कंपनियाँ अस्पतालों के लिए यह पहचान नंबर इस्तेमाल करती हैं। |
| hospital.noPricesCity | Treatment prices for {city} hospitals aren't available yet. We only have them for Bangalore. | {city} के अस्पतालों के लिए इलाज की कीमतें अभी उपलब्ध नहीं हैं। ये सिर्फ़ बैंगलोर के लिए हैं। |
| hospital.noPricesHere | No treatment prices are linked to this hospital yet. | इस अस्पताल से अभी कोई इलाज कीमत नहीं जुड़ी है। |
| hospital.seeUsual | See market estimates for Bangalore | बैंगलोर के बाज़ार अनुमान देखें |
| hospital.checkQuote | Got a quote or bill from here? Check it | यहाँ से कोटेशन या बिल मिला है? उसे जाँचें |
| hospital.ratingLine | {rating} out of 5 · {n} reviews on Google | 5 में से {rating} · Google पर {n} समीक्षाएँ |
| hospital.shareHere | Treated here? Share your bill anonymously | यहाँ इलाज हुआ? अपना बिल बिना नाम के साझा करें |
| reviews.readMore | Read more | पूरा पढ़ें |
| rates.lead | What the government pays hospitals under CGHS (Tier I). Private hospitals usually charge more, so treat this as a floor, not a fair price. | CGHS के तहत सरकार अस्पतालों को जितना देती है (टियर I)। निजी अस्पताल आम तौर पर ज़्यादा लेते हैं, इसलिए इसे सबसे निचली रकम मानें, सही कीमत नहीं। |
| rates.about | About these rates | इन दरों के बारे में |
| rates.searchLabel | Search a treatment or CGHS code | इलाज या CGHS कोड खोजें |
| rates.specialtyLabel | Specialty | विशेषज्ञता |
| rates.hospitalType | Hospital type | अस्पताल का प्रकार |
| rates.nabh / rates.nonNabh | NABH accredited / Not NABH accredited | NABH मान्यता प्राप्त / NABH मान्यता नहीं |
| rates.whatNabh | What is NABH? | NABH क्या है? |
| rates.whatNabhBody | NABH is a national quality accreditation for hospitals. CGHS pays accredited hospitals a higher rate. | NABH अस्पतालों की एक राष्ट्रीय गुणवत्ता मान्यता है। CGHS मान्यता वाले अस्पतालों को ज़्यादा दर देता है। |
| rates.codeLabel | Code {code} | कोड {code} |
| share.start | Start | शुरू करें |
| share.closedButton | Sharing opens soon | साझा करना जल्द शुरू होगा |
| share.continue | Continue | आगे बढ़ें |
| share.duration | About 2 minutes | लगभग 2 मिनट |
| share.stepQ.what | Which treatment was it? | कौन-सा इलाज हुआ था? |
| share.stepQ.where | Where was it done? | इलाज कहाँ हुआ? |
| share.stepQ.stay | Tell us about the stay | अस्पताल में रहने के बारे में बताएँ |
| share.stepQ.money | What did it cost? | कितना खर्च हुआ? |
| share.stepQ.breakdown | What made up the bill? (optional) | बिल में क्या-क्या शामिल था? (वैकल्पिक) |
| share.stepQ.review | Check your answers | अपने जवाब जाँचें |
| share.errorSummary | There is a problem | कुछ ठीक करना है |
| share.kindPrefilled | Kind of treatment: {kind} | इलाज का प्रकार: {kind} |
| share.removeCharge | Remove charge {n} | चार्ज {n} हटाएँ |
| share.done.home | Back to home | होम पर वापस |
| methodology.onThisPage | On this page | इस पेज पर |
| methodology.shortHeading | The short version | संक्षेप में |
| methodology.short1 | Every price is a range, with its source and date. | हर कीमत एक दायरा (रेंज) है, उसके स्रोत और तारीख के साथ। |
| methodology.short2 | When we're not sure two things match, we show no match instead of guessing. | जब पक्का न हो कि दो चीज़ें मेल खाती हैं, तो हम अंदाज़ा नहीं लगाते, 'मिलान नहीं' दिखाते हैं। |
| methodology.short3 | Bills shared by patients are kept separate and checked by hand. | मरीज़ों के साझा किए बिल अलग रखे जाते हैं और हाथ से जाँचे जाते हैं। |
| methodology.storesHeading | Jan Aushadhi stores | जन औषधि केंद्र |
| methodology.patientHeading | Bills shared by patients | मरीज़ों के साझा किए बिल |
| methodology.patientBody | Every shared bill is checked by hand before it counts. We show a figure only for a city and treatment, once at least {n} checked bills from {b} different people are in, and we never name a hospital. These figures come from patients, are not verified, and are kept apart from sourced prices. | हर साझा बिल गिनती में आने से पहले हाथ से जाँचा जाता है। किसी शहर और इलाज का आँकड़ा तभी दिखता है जब {b} अलग-अलग लोगों के कम से कम {n} जाँचे हुए बिल हों, और किसी अस्पताल का नाम कभी नहीं दिखाया जाता। ये आँकड़े मरीज़ों से आते हैं, जाँचे नहीं गए, और स्रोत वाली कीमतों से अलग रखे जाते हैं। |
| methodology.reviewsHeading | Google reviews and AI summaries | Google समीक्षाएँ और AI सारांश |
| methodology.reviewsBody | For some Bangalore hospitals we show Google reviews, fetched on the date shown, with each author's name and a link to the review. We show them only when both the hospital's name and its location match exactly. The summary above them is written by an AI model and can be wrong. | बैंगलोर के कुछ अस्पतालों के लिए हम Google समीक्षाएँ दिखाते हैं, जो दिखाई गई तारीख को ली गईं, हर लेखक के नाम और समीक्षा के लिंक के साथ। हम इन्हें तभी दिखाते हैं जब अस्पताल का नाम और जगह दोनों पूरी तरह मिलें। इनके ऊपर का सारांश एक AI मॉडल लिखता है और ग़लत हो सकता है। |
| methodology.datesHeading | Dates on prices | कीमतों पर तारीख |
| methodology.datesBody | Medicine, ceiling and store prices show the date of the list they come from. Where we haven't recorded when a list was downloaded, such as the HexaHealth estimates and the CGHS rate list, we say "date not recorded" instead of guessing. | दवा, अधिकतम कीमत और केंद्रों की जानकारी पर उस सूची की तारीख दिखती है जिससे वह ली गई। जहाँ सूची की डाउनलोड तारीख दर्ज नहीं है, जैसे HexaHealth के अनुमान और CGHS दर सूची, वहाँ हम अंदाज़ा लगाने के बजाय "तारीख दर्ज नहीं" लिखते हैं। |
| methodology.correctionsLink | Report a mistake on GitHub | GitHub पर ग़लती बताएँ |
| footer.colTreatment / colMedicines / colHospitals / colAbout | Treatment costs / Medicines / Hospitals / About MedCost | इलाज का खर्च / दवाइयाँ / अस्पताल / MedCost के बारे में |
| footer.appearance | Appearance | रंग-रूप |
| theme.system / theme.light / theme.dark | Auto / Light / Dark | अपने-आप / हल्का / गहरा |
| footer.notAdvice | Information, not medical advice. Ask your doctor before changing any treatment or medicine. | यह जानकारी है, डॉक्टरी सलाह नहीं। कोई भी इलाज या दवा बदलने से पहले अपने डॉक्टर से पूछें। |
| footer.emergency | Emergency? Call 112, or 108 for an ambulance. | आपात स्थिति में 112 पर कॉल करें, एम्बुलेंस के लिए 108। |
| footer.licence | Medicine data is shared under CC BY-SA 4.0. | दवाइयों का डेटा CC BY-SA 4.0 लाइसेंस के तहत साझा है। |
| notFound.title | We can't find this page | यह पेज नहीं मिला |
| notFound.body | The link may be broken, or the page may have moved. Try one of these: | लिंक टूटा हो सकता है, या पेज कहीं और चला गया है। इनमें से कोई आज़माएँ: |
| notFound.home | Go to the home page | होम पेज पर जाएँ |

### 8.3 Keys to delete, in both locales, once the owning page stops referencing them
- **home:** `eyebrow`, `subtitle`, `actionQuoteTitle`, `actionQuoteBody`, `actionBillTitle`, `actionBillBody`, `orSearch`, `actionShareTitle`, `actionShareBody`, `statProcedures`, `statHospitals`, `statCities`, `exampleEyebrow`, `exampleTitleSuffix`, `marketRange`, `sourceHexaHealth`, `hospitalsPriced`, `namedHospitals`, `govReference`, `notAvailable`, `tierNote`, `seeComparison`, `featuresHeading`, `features[]` (its false "correction channel on every page" claim must not return), `ctaBody`, `ctaButton`, `searchPlaceholder`, `searchNoMatch`.
- **nav:** `findPrice`. **footer:** `explore`, `tools`, `about`.
- **procedures:** `hospitalsPricedBadge`, `cghsReferenceBadge`.
- **procedure:** `titleSuffix`, `sourceLabel`, `editorialNote`, `govRefTitle`, `generalWardNabh`, `wardBreakdown`, `methodologyLink`, `comparisonHeading`, `colHospital`, `colMin`, `colAvg`, `colMax`.
- **rates:** `eyebrow`, `loadMore`.
- **hospitals:** `subtitle`. **city:** `titleSuffix`, `searchPlaceholder`, `shownCount`.
- **hospital:** `noProceduresPre`, `allProcedures`, `noProceduresPost`, `procedureColumn`.
- **medicines:** `eyebrow`, `subtitle`, `savingsLine`.
- **kendras:** `subtitle`, `pinPlaceholder`.
- **quote:** `eyebrow`, `subtitle`, `procedurePlaceholder`, `wardNoCghs`, `rangeHeading`, `rangeSource`.
- **bill:** `eyebrow`, `subtitle`, `scanButton`, `or`.
- **share:** `eyebrow`, `next`, `steps.*`.

**Parity check (zero dependencies).** Append to `translations.ts`:
```ts
const _hiHasEn: typeof translations.en = translations.hi; const _enHasHi: typeof translations.hi = translations.en; void _hiHasEn; void _enHasHi;
```
`next build` type-checks this, so a key missing in either locale fails the build.

---

## 9. Do-not-break list, acceptance checks and work plan

### 9.1 Do not break
**Build and routing**
- Static export: `NEXT_PUBLIC_DEPLOY_TARGET=static`, basePath `/medcost-india`, no API routes or route handlers, no server runtime, no page code branching by deploy target.
- `dynamicParams = false` + `generateStaticParams` on every dynamic route.
- All 14 routes resolve at their current URLs, and `404.html` is emitted.

**Data seam**
- `lib/data.ts`, `cghs.ts`, `reviews.ts`, `medicines.ts`, `medicineShards.ts`, plus the new `staticData.ts`, are the only runtime readers.
- `scripts/build-search-index.mjs` is the only build-time projection.
- Never import `data/generated/*.json`, `lib/data.ts`, `lib/reviews.ts` or `lib/medicines.ts` from a client component.
- Shard fetch paths stay unchanged.

**Theming and i18n**
- CSS custom properties only, with tokens named per §3.
- Storage keys `medcost-theme` and `medcost-locale`. The no-flash resolution order is unchanged (only the locale script and `lang` are added).
- Every string goes through `t()` in en **and** hi. Data text is never translated (DataText adds `lang="en" translate="no"`).

**Prices and honesty**
- Every price is a range or an official single rate, with a visible source and a date or "date not recorded". **Dates are never invented** (`data/source-dates.json` stays null until the owner fills it).
- HexaHealth always carries "Market estimate, not a bill", and the `procedure.footerNote` meaning is kept.
- All money goes through `formatINR` / `formatINRUnit`. `parseCghsAmount` is used for CGHS strings.
- The wording is "above / within / below the market estimate or legal ceiling", never "overcharged". Amber for "above"; red only for form errors.

**Matching states stay visible**
- No CGHS match; no hospital breakdown; unmatched hospital names as plain text; no review section when the record is null; "Listed by PMBJP without a published price"; "Not under NPPA price control"; the Bangalore gate (`city === "bangalore"`).

**Patient-reported layer**
- A separate dashed `PatientReported` box, only on the `/share-bill` intro.
- City + procedure only, ≥5 bills from ≥3 browsers, hospitals never shown, never `text-figure` or accent, never presented as a source.
- `share.consent`, the promises, `notOpen`, the rate-limit and busy messages, the receipt ID, `browser_id`, and the `submit_bill()` / `bill_stats()` contracts are unchanged.

**Reviews (legal requirements)**
- Author attribution + profile link, per-review Google Maps link, place link, photos hotlinked (never re-hosted) with the `onError` drop, the fetch date, and the AI label + disclaimer.
- Reviews are read in the server component only.

**Medicines**
- NPPA "excluding GST", the ×1.12 `MAX_GST` rule, the `STRIPS_SUSPECT` "check quantity" rule (neutral, not a flag).
- The "(2022)" and "Nov 2022" markers; the CC BY-SA 4.0 credit with the Kaggle link; the PMBJP code; the S.O., date and NLEM.
- The savings caveat, the related-medicines warning, and honest truncation ("Cheapest {shown} of {total}").
- OCR runs in the browser (lazy `tesseract.js`). Chips are offered, never auto-searched or auto-picked. The privacy line sits next to every photo button.

**Kendras**
- "Same PIN" / "Same postal area (PIN xxx)", no distance claims, no operator names, `?pin=` deep link with Suspense.

**Map**
- `next/dynamic` with `ssr:false`, the ResizeObserver, an explicit container height, a visible fallback, and a list that works without the map.

**Other**
- `/check-quote#slug` preselection.
- No payer or insurance axis.
- The footer tagline, a methodology link reachable from every page, and the creator credit.
- No new runtime dependencies (icons are inline SVG, fonts come only through `next/font/google`).

### 9.2 Acceptance checks (all must pass before "done")
1. `npm run lint` and `NEXT_PUBLIC_DEPLOY_TARGET=static npm run build` both pass. `prebuild` writes `public/data/search/*.json`, and `out/data/search/{procedures,hospitals,cghs}.json` exist.
2. This grep returns 0 hits, except `app/layout.tsx` `themeColor`:
   ```
   grep -rnE "#[0-9a-fA-F]{3,8}\b" app components --include=*.tsx
   ```
3. This grep returns 0 hits, except `border-dashed` in `components/ui/PatientReported.tsx`:
   ```
   grep -rnE "\bdark:|text-white|bg-white|uppercase|tracking-|text-(xs|sm)\b|text-\[[0-9]+px\]|border-dashed|backdrop-|font-bold|bg-gradient|(^|[\" ])outline-none" app components --include=*.tsx
   ```
   `focus-visible:outline-none` and `focus:outline-none` are allowed only as listed in §5.1.
4. `grep -rn "formatINR(Number" app components` returns 0 hits.
5. `grep -rl "SHALIMAR BAGH\|Pantoflam CT\|PMBJK00258" out/_next/static` returns nothing. `out/index.html`, `out/procedures.html` and `out/hospitals.html` reference no chunk containing hospital rows.
6. `out/404.html` contains "MedCost". `out/share-bill.html` is under 120 KB.
7. The i18n parity type check compiles (§8.3).
8. Manual pass at 360px in **light and dark** × **en and hi**:
   - no horizontal page scroll
   - skip link works
   - focus is visible on every control
   - every target is at least 44×44
   - comboboxes respond to ↑/↓/Enter/Escape
   - segmented controls respond to arrow keys
   - the dialog traps focus
   - the verdict is announced
   - every price block is followed by a SourceNote
   - the tab bar hides while typing
   - the Android back button steps back through share-bill questions
   - a returning Hindi user sees no English flash, and content is never hidden longer than 600ms
   - an English session downloads no Devanagari font file (check the Network panel)
9. On the `/hospitals/[city]/[slug]` page for a hospital with phone `0-0`, the Call button is absent.

### 9.3 Work plan (parallel-safe)
| Phase / stream | Owner scope (files) | Depends on |
|---|---|---|
| **0. Foundation** (one PR, merges first) | `app/globals.css`, `app/layout.tsx`, both providers + scripts, `LOCALES`, **all §8 keys**, `lib/format.ts` additions, `lib/types.ts` `SourceDates`, `data/source-dates.json`, `lib/data.ts getSourceDates`, `lib/staticData.ts`, `lib/nav.ts`, `lib/procedureGroups.ts`, `lib/search/*`, `scripts/build-search-index.mjs` + package.json + .gitignore, all of `components/ui/*`, `components/chrome/*`, `components/search/*`, `app/not-found.tsx`, `app/icon.svg`; delete `ThemeToggle.tsx`, `LanguageToggle.tsx`, `public/{file,globe,next,vercel,window}.svg`, `app/favicon.ico` | — |
| **A. Home** | `app/page.tsx`, `components/HomeView.tsx`; delete `ProcedureSearch.tsx` | 0 |
| **B. Treatment** | `/procedures`, `/procedures/[slug]`, `/check-quote`, `/rates` (`ProcedureListView`, `ProcedureDetailView`, `QuoteCheckView`, `RateExplorer`); delete `ProcedureGrid.tsx` | 0 |
| **C. Medicines** | `/medicines`, `/medicines/[slug]`, `/kendras`, `/check-bill` (`MedicineSearchView`, `MedicineDetailView`, `KendraFinder`, `PrescriptionScan`, `BillCheckView`) | 0 |
| **D. Hospitals** | `/hospitals`, `/hospitals/[city]`, `/hospitals/[city]/[slug]` (`CityView`, `HospitalListClient`, `HospitalMap`, `HospitalMapLoader`, `HospitalDetailView`, `HospitalReviews`) | 0 |
| **E. Share + methodology** | `/share-bill` (`ShareBillView`), `/methodology` | 0 |
| **5. Cleanup** | delete §8.3 keys; migrate any remaining `brand-*`/`ink-*`/`warn-50…900` usages to role tokens; add `--color-*: initial`; rerun §9.2 | A–E |

During streams A–E nobody edits `translations.ts` except to fix a typo in their own namespace. Missing copy goes back to Phase 0 as a follow-up commit.