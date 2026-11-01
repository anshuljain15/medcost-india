// Checks every t() key used in app/, components/ and lib/ against
// lib/i18n/translations.ts: the key exists in BOTH locales, is a string, and
// every {placeholder} is passed. Usage:
//   node scripts/check-i18n.cjs                 # whole repo
//   node scripts/check-i18n.cjs components/Foo  # only report files under these prefixes
// Exits 1 if anything is wrong. No dependencies beyond the repo's typescript.
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS script run directly by node */
const path = require("path");
const fs = require("fs");
const root = path.resolve(__dirname, "..");
const only = process.argv.slice(2).map((p) => p.split(path.sep).join("/").replace(/^\.\//, ""));
const ts = require(path.join(root, "node_modules", "typescript"));

// 1. Evaluate translations.ts for real.
const src = fs.readFileSync(path.join(root, "lib/i18n/translations.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const { translations } = mod.exports;
const NS = new Set(Object.keys(translations.en));
function resolve(obj, p) { return p.split(".").reduce((a, k) => (a && typeof a === "object" && k in a ? a[k] : undefined), obj); }
function placeholders(s) { return new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1])); }

// 2. Walk source files.
function walkDir(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.(tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = [...walkDir(path.join(root, "app"), []), ...walkDir(path.join(root, "components"), []), ...walkDir(path.join(root, "lib"), [])]
  .filter((f) => !f.endsWith("translations.ts"));
const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const isTarget = (r) => only.length === 0 || only.some((p) => r.startsWith(p));

const uses = []; // {file, line, key, vars|null|'none'|'dynamic', how}
const dynamic = [];
const KEY_RE = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
const TEMPLATE_EXPAND = {
  "medicines.unit.": ["tablet", "capsule"],
  "quote.status.": ["within", "above", "below", "unknown"],
};

for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const r = rel(f);
  const lineOf = (n) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
  function varsOf(arg) {
    if (!arg) return "none";
    if (ts.isObjectLiteralExpression(arg)) {
      const names = [];
      for (const p of arg.properties) {
        if (ts.isSpreadAssignment(p)) return "dynamic";
        names.push(p.name.getText(sf));
      }
      return names;
    }
    return "dynamic";
  }
  function keysFromArg(arg) {
    if (!arg) return null;
    if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return [arg.text];
    if (ts.isConditionalExpression(arg)) {
      const a = keysFromArg(arg.whenTrue), b = keysFromArg(arg.whenFalse);
      return a && b ? [...a, ...b] : null;
    }
    if (ts.isParenthesizedExpression(arg)) return keysFromArg(arg.expression);
    if (ts.isTemplateExpression(arg)) {
      const head = arg.head.text;
      if (arg.templateSpans.length === 1 && arg.templateSpans[0].literal.text === "" && TEMPLATE_EXPAND[head])
        return TEMPLATE_EXPAND[head].map((x) => head + x);
      return null;
    }
    return null;
  }
  function visit(n) {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
      if (name === "t" || name === "withPrice") {
        const keys = keysFromArg(n.arguments[0]);
        const vars = name === "withPrice" ? ["price"] : varsOf(n.arguments[1]);
        if (keys) for (const k of keys) uses.push({ file: r, line: lineOf(n), key: k, vars, how: name });
        else if (n.arguments[0]) dynamic.push(`${r}:${lineOf(n)} ${name}(${n.arguments[0].getText(sf).slice(0, 60)})`);
      }
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && KEY_RE.test(n.text) && NS.has(n.text.split(".")[0])) {
      uses.push({ file: r, line: lineOf(n), key: n.text, vars: "literal", how: "literal" });
    }
    ts.forEachChild(n, visit);
  }
  visit(sf);
}

// 3. Report.
const seen = new Set();
const problems = { target: [], pages: [] };
const usedKeys = new Set();
for (const u of uses) {
  const id = `${u.file}:${u.line}:${u.key}:${u.how}`;
  if (seen.has(id)) continue;
  seen.add(id);
  usedKeys.add(u.key);
  const bucket = isTarget(u.file) ? problems.target : problems.pages;
  const en = resolve(translations.en, u.key), hi = resolve(translations.hi, u.key);
  if (u.how === "literal") {
    // Bare key-like literal (nav tables, defaults): must exist in both locales (string or array).
    if (en === undefined || hi === undefined) bucket.push(`MISSING ${u.key} (en:${en !== undefined} hi:${hi !== undefined}) literal at ${u.file}:${u.line}`);
    continue;
  }
  if (typeof en !== "string" || typeof hi !== "string") {
    bucket.push(`NOT-A-STRING ${u.key} (en:${typeof en} hi:${typeof hi}) via ${u.how} at ${u.file}:${u.line}`);
    continue;
  }
  const pe = placeholders(en), ph = placeholders(hi);
  if ([...pe].sort().join() !== [...ph].sort().join()) bucket.push(`PLACEHOLDER-DRIFT ${u.key} en{${[...pe]}} hi{${[...ph]}}`);
  if (u.vars === "dynamic") continue;
  const given = new Set(u.vars === "none" ? [] : u.vars);
  const missing = [...pe].filter((p) => !given.has(p));
  if (missing.length) bucket.push(`UNFILLED {${missing}} in ${u.key} at ${u.file}:${u.line} (passes ${u.vars === "none" ? "no vars" : "{" + [...given] + "}"})`);
}
console.log("key uses scanned:", seen.size, "| distinct keys:", usedKeys.size);
console.log(`problems${only.length ? " under " + only.join(", ") : ""}:`, problems.target.length);
for (const p of problems.target) console.log("  " + p);
if (dynamic.length) {
  console.log("non-literal t() keys (verify by hand):");
  for (const d of dynamic.filter((d) => isTarget(d.split(":")[0]))) console.log("  " + d);
}
process.exit(problems.target.length ? 1 : 0);
