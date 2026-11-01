#!/usr/bin/env node
// Build-time projection of the committed snapshot into the small static search
// indexes the browser fetches (through lib/staticData.ts) on first use:
//
//   data/generated/procedures.json  ─┐
//   data/generated/hospitals.json   ─┤    public/data/search/procedures.json
//   data/generated/cghs_rates.json  ─┼─>  public/data/search/hospitals.json
//   data/generated/medicines.json   ─┤    public/data/search/cghs.json
//   data/source-dates.json          ─┘    public/data/search/medicine-refs.json
//
// Runs from `predev` and `prebuild` (so in CI too, on Node 20). Zero
// dependencies, no network. The output is gitignored and always regenerated.
//
// This is the only build-time reader of data/generated/ besides the lib/
// seam. When the Postgres source lands, this script changes together with
// lib/data.ts and lib/cghs.ts; the output shapes are the contract typed in
// lib/staticData.ts (ProcedureIndex, HospitalIndex, CghsIndex,
// MedicineRefIndex): change both sides together.
//
// Honesty: dates come only from data/source-dates.json and stay null when the
// owner has not recorded one ("date not recorded" in the UI). CGHS amounts are
// copied as the raw scraped strings; lib/format.ts parseCghsAmount reads them.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "data", "search");

function readJson(...parts) {
  const file = join(ROOT, ...parts);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`build-search-index: cannot read ${relative(ROOT, file)}: ${err.message}`);
  }
}

function fail(message) {
  throw new Error(`build-search-index: ${message}`);
}

const isoOrNull = (value, key) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
    fail(`data/source-dates.json "${key}" must be null or an ISO date (YYYY-MM or YYYY-MM-DD), got ${JSON.stringify(value)}`);
  }
  return value;
};

const strOrNull = (v) => (typeof v === "string" && v.trim() !== "" ? v : null);
const numOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ---- inputs -------------------------------------------------------------------
const procedures = readJson("data", "generated", "procedures.json");
const hospitals = readJson("data", "generated", "hospitals.json");
const cghsRates = readJson("data", "generated", "cghs_rates.json");
const sourceDates = readJson("data", "source-dates.json");
const medicines = readJson("data", "generated", "medicines.json");

if (!Array.isArray(procedures) || !Array.isArray(hospitals) || !Array.isArray(cghsRates)) {
  fail("expected procedures.json, hospitals.json and cghs_rates.json to be arrays");
}
if (!medicines || !Array.isArray(medicines.groups)) fail("expected medicines.json to have a groups array");

// The same rule as lib/data.ts isConsistentHospitalPrice: a hospital row is
// counted only when min <= avg <= max over the values present, so the count
// in search matches the rows the procedure page shows.
const isConsistentHospitalPrice = (h) => {
  const lo = numOrNull(h.min) ?? -Infinity;
  const hi = numOrNull(h.max) ?? Infinity;
  const avg = numOrNull(h.avg);
  return lo <= hi && (avg === null || (lo <= avg && avg <= hi));
};

// ---- procedures: {v, date, p: [slug, name, low, high, hospitalCount][]} -----
const procedureIndex = {
  v: 1,
  date: isoOrNull(sourceDates.hexahealth, "hexahealth"),
  p: procedures.map((p) => {
    if (typeof p.slug !== "string" || typeof p.name !== "string") fail("a procedure has no slug/name");
    return [
      p.slug,
      p.name,
      numOrNull(p.cityLow),
      numOrNull(p.cityHigh),
      Array.isArray(p.hospitalPrices) ? p.hospitalPrices.filter(isConsistentHospitalPrice).length : 0,
    ];
  }),
};

// ---- hospitals: {v, c: citySlugs[], l: cityNames[], h: [name, cityIndex, slug | 0, pincode][]} ---
// The city URL segment is the display name lowercased (same as lib/data.ts).
//
// The slug is written as 0 when hospitalSlug(name) rebuilds it exactly (about
// 98% of rows; de-duplicated "-2" slugs are spelled out), which keeps the file
// near its ~40 KB gzipped budget. lib/staticData.ts loadHospitalIndex() fills
// it back in with the same function. Keep the three copies of the rule in
// step: data-pipeline/build_static_data.py slugify(), lib/staticData.ts
// hospitalSlug() and this one.
const hospitalSlug = (name) =>
  name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const cityNames = [...new Set(hospitals.map((h) => h.city))].sort();
const cityIndex = new Map(cityNames.map((name, i) => [name, i]));
const hospitalIndex = {
  v: 1,
  c: cityNames.map((name) => name.toLowerCase()),
  l: cityNames,
  h: hospitals.map((h) => {
    if (typeof h.slug !== "string" || typeof h.name !== "string") fail("a hospital has no slug/name");
    // The browser rebuilds an elided slug from slot 0, so the test must use
    // exactly the name written to slot 0 (if a display name ever replaces
    // h.name there, test that one).
    const name = h.name;
    const slug = hospitalSlug(name) === h.slug ? 0 : h.slug;
    return [name, cityIndex.get(h.city), slug, strOrNull(h.pincode)];
  }),
};

// ---- CGHS: {v, date, s: specialties[], r: [code, name, s-index, nabh, general, semi, private][]} ---
const specialties = [...new Set(cghsRates.map((r) => r.specialty))].sort();
const specialtyIndex = new Map(specialties.map((name, i) => [name, i]));
const rawAmount = (v) => (typeof v === "string" ? v : null);
const cghsIndex = {
  v: 1,
  date: isoOrNull(sourceDates.cghs, "cghs"),
  s: specialties,
  r: cghsRates.map((r) => [
    r.code,
    r.name,
    specialtyIndex.get(r.specialty),
    r.nabh ? 1 : 0,
    rawAmount(r.generalWard),
    rawAmount(r.semiPrivateWard),
    rawAmount(r.privateWard),
  ]),
};

// ---- medicine refs: {v, r: [slug, title, form, jaPerUnit, ceiling, soNumber, soDate][]} ---
// The bill checker's reference prices (~1,400 rows), fetched when the first
// line appears instead of riding in /check-bill's HTML as props. The same
// derivation as lib/medicines.ts getMedicineRefs(): jaPerUnit is the cheapest
// Jan Aushadhi per-unit price that was published; the NPPA ceiling keeps its
// S.O. number and date. lib/staticData.ts loadMedicineRefs() decodes it.
const medicineRefIndex = {
  v: 1,
  r: medicines.groups.map((g) => {
    if (typeof g.slug !== "string" || typeof g.title !== "string") fail("a medicine group has no slug/title");
    const ja = (Array.isArray(g.janAushadhi) ? g.janAushadhi : []).map((p) => numOrNull(p.perUnit)).filter((n) => n !== null);
    const c = g.nppaCeiling;
    return [
      g.slug,
      g.title,
      g.form,
      ja.length > 0 ? Math.min(...ja) : null,
      c ? numOrNull(c.ceilingPrice) : null,
      c ? c.soNumber : null,
      c ? c.soDate : null,
    ];
  }),
};

// ---- write --------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
for (const [file, data, rows] of [
  ["procedures.json", procedureIndex, procedureIndex.p.length],
  ["hospitals.json", hospitalIndex, hospitalIndex.h.length],
  ["cghs.json", cghsIndex, cghsIndex.r.length],
  ["medicine-refs.json", medicineRefIndex, medicineRefIndex.r.length],
]) {
  const body = JSON.stringify(data);
  writeFileSync(join(OUT_DIR, file), body);
  const bytes = Buffer.byteLength(body);
  console.log(
    `build-search-index: public/data/search/${file}  ${rows} rows  ${kb(bytes)} (${kb(gzipSync(body).length)} gzipped)`
  );
}

// The site promises a visible date for every price. Say loudly (but do not
// fail: a date is never guessed) which sources still render "date not recorded".
const missingDates = ["hexahealth", "cghs", "directory"].filter((key) => !sourceDates[key]);
if (missingDates.length) {
  console.warn(
    `build-search-index: WARNING data/source-dates.json has no date for ${missingDates.join(", ")}; ` +
      `every price from ${missingDates.length === 1 ? "that source" : "those sources"} shows "date not recorded". ` +
      `Record the real retrieval date (YYYY-MM or YYYY-MM-DD) from the fetch records; never guess one.`
  );
}
