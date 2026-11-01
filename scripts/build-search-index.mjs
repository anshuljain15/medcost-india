#!/usr/bin/env node
// Build-time projection of the committed snapshot into the small static search
// indexes the browser fetches (through lib/staticData.ts) on first use:
//
//   data/generated/procedures.json  ─┐
//   data/generated/hospitals.json   ─┼─>  public/data/search/procedures.json
//   data/generated/cghs_rates.json  ─┤    public/data/search/hospitals.json
//   data/source-dates.json          ─┘    public/data/search/cghs.json
//
// Runs from `predev` and `prebuild` (so in CI too, on Node 20). Zero
// dependencies, no network. The output is gitignored and always regenerated.
//
// This is the only build-time reader of data/generated/ besides the lib/
// seam. When the Postgres source lands, this script changes together with
// lib/data.ts and lib/cghs.ts; the output shapes are the contract typed in
// lib/staticData.ts (ProcedureIndex, HospitalIndex, CghsIndex): change both
// sides together.
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

if (!Array.isArray(procedures) || !Array.isArray(hospitals) || !Array.isArray(cghsRates)) {
  fail("expected procedures.json, hospitals.json and cghs_rates.json to be arrays");
}

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
      Array.isArray(p.hospitalPrices) ? p.hospitalPrices.length : 0,
    ];
  }),
};

// ---- hospitals: {v, c: citySlugs[], l: cityNames[], h: [name, cityIndex, slug, pincode][]} ---
// The city URL segment is the display name lowercased (same as lib/data.ts).
const cityNames = [...new Set(hospitals.map((h) => h.city))].sort();
const cityIndex = new Map(cityNames.map((name, i) => [name, i]));
const hospitalIndex = {
  v: 1,
  c: cityNames.map((name) => name.toLowerCase()),
  l: cityNames,
  h: hospitals.map((h) => {
    if (typeof h.slug !== "string" || typeof h.name !== "string") fail("a hospital has no slug/name");
    return [h.name, cityIndex.get(h.city), h.slug, strOrNull(h.pincode)];
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

// ---- write --------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
for (const [file, data, rows] of [
  ["procedures.json", procedureIndex, procedureIndex.p.length],
  ["hospitals.json", hospitalIndex, hospitalIndex.h.length],
  ["cghs.json", cghsIndex, cghsIndex.r.length],
]) {
  const body = JSON.stringify(data);
  writeFileSync(join(OUT_DIR, file), body);
  const bytes = Buffer.byteLength(body);
  console.log(
    `build-search-index: public/data/search/${file}  ${rows} rows  ${kb(bytes)} (${kb(gzipSync(body).length)} gzipped)`
  );
}
