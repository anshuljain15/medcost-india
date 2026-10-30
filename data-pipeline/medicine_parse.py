"""
Turns a product name from any of the three price sources into a canonical
COMPOSITION: (form, release, ((salt, strength), ...)).

Two products are "the same medicine" only when their compositions are EQUAL --
same salts, same strengths, same form, same release type. The same rule as the
hospital matcher in build_procedures.py: exact equality on a normalised key,
never a similarity score. A wrong match here tells a patient that a different
medicine is a substitute for theirs, so every parse that is not clean returns
None, and None is a visible, counted state (see build_medicines.py).

DECISIONS (each one is deliberate; change them only with a reason)
- Tablets and capsules only. Liquids and injections need a per-ml/per-vial
  comparison and a volume parse that the sources don't support cleanly.
- Tablet != capsule. NPPA itself fixes different ceilings for omeprazole 40 mg
  capsule and tablet.
- Release is part of the key. Sustained/extended/prolonged/controlled release
  ("modified") never groups with immediate release: metformin 500 SR is not
  metformin 500. Dispersible, mouth-dissolving, chewable and effervescent are
  each their own type.
- Gastro-resistant / enteric-coated / delayed-release collapse to "standard".
  Oral PPIs are gastro-resistant by necessity and the brand-price source never
  says so ("PAN 40 Tablet"); keeping them apart would hide every PPI generic.
  The Jan Aushadhi product name, which does say it, is shown on the page.
- Salt forms collapse to the active moiety (pantoprazole sodium -> pantoprazole,
  metformin hydrochloride -> metformin), matching how the brand source already
  writes compositions. NOT collapsed, because the salt changes the product:
  metoprolol succinate/tartrate, mycophenolate mofetil/sodium, isosorbide
  mononitrate/dinitrate.
- "OD" is ambiguous (once-daily is often, not always, extended release), so a
  product marked OD is unparsed rather than guessed.
- Every salt must be in the CDCI substance vocabulary (sources/cdci.py) or be
  an explicit alias target. That rejects typos and parse debris.

Run this file directly to execute the self-checks at the bottom.
"""

import re
import unicodedata

# ---------------------------------------------------------------- salt names

# Applied to the whole cleaned salt string, before and after stripping salt forms.
SALT_ALIASES = {
    "amoxycillin": "amoxicillin",
    "acetaminophen": "paracetamol",
    "potassium clavulanate": "clavulanic acid",
    "clavulanate potassium": "clavulanic acid",
    "clavulanate": "clavulanic acid",
    "diluted potassium clavulanate": "clavulanic acid",
    "sulphamethoxazole": "sulfamethoxazole",
    "frusemide": "furosemide",
    "glyburide": "glibenclamide",
    "thyroxine": "levothyroxine",
    "l-thyroxine": "levothyroxine",
    "vitamin d3": "cholecalciferol",
    "chlorphenamine": "chlorpheniramine",
    "albuterol": "salbutamol",
    "ursodiol": "ursodeoxycholic acid",
    "esomeprazole magnessium": "esomeprazole",  # sic, as spelled in the PMBJP list
    "cyanocobalamine": "cyanocobalamin",
    "ethinyl estradiol": "ethinylestradiol",
    # spellings and INN variants seen in the PMBJP list and the A-Z dataset,
    # each mapped to the name CDCI uses
    "methylcobalamin": "mecobalamin",
    "methylcobalamin/mecobalamin": "mecobalamin",
    "duloxetin": "duloxetine",
    "torasemide": "torsemide",
    "aciclovir": "acyclovir",
    "s-amlodipine": "levamlodipine",
    "s- amlodipine": "levamlodipine",
    "s amlodipine": "levamlodipine",
    "mesalazine": "mesalamine",
    "nicoumalone": "acenocoumarol",
    "nicoumalone acenocoumarol": "acenocoumarol",
    "phenobarbitone": "phenobarbital",
    "dosulepin": "dothiepin",
    "flecanide": "flecainide",
    "cetrizine": "cetirizine",
    "glimipride": "glimepiride",
    "etophylline": "etofylline",
    "etophyllin": "etofylline",
    "l-methylfolate": "levomefolate",
    # sodium valproate and valproic acid are combined in one product
    # (Valparin Chrono), so they stay two salts
    "valproate sodium": "sodium valproate",
}

# Real substances on the Indian market that the CDCI substance list lacks.
# Verified by hand; add here rather than loosening the vocabulary gate.
EXTRA_VOCAB = {
    "serratiopeptidase", "acebrophylline", "etofylline", "ilaprazole",
    "hyoscine butylbromide", "efonidipine", "sodium valproate",
}

# Dropped when they follow the first word ("losartan potassium" -> "losartan"),
# never when they ARE the first word ("potassium chloride" stays).
SALT_FORM_WORDS = {
    "hydrochloride", "hcl", "dihydrochloride", "hydrobromide", "sodium",
    "potassium", "mesylate", "mesilate", "besylate", "besilate", "maleate",
    "fumarate", "citrate", "sulphate", "sulfate", "bisulphate", "bisulfate",
    "phosphate", "magnesium", "magnessium", "calcium", "bromide", "hyclate",
    "cilexetil", "medoxomil", "axetil", "proxetil", "pivoxil", "propanediol",
    "dihydrate", "trihydrate", "monohydrate", "sesquihydrate", "hemihydrate",
    "hydrate", "anhydrous", "tromethamine", "olamine", "dimesylate", "acetate",
    "hydrchloride", "ethanolate",
}
NEVER_STRIP = {
    "metoprolol succinate", "metoprolol tartrate", "mycophenolate mofetil",
    "mycophenolate sodium", "isosorbide mononitrate", "isosorbide dinitrate",
}

NOISE_WORDS = {"ip", "bp", "usp", "i p", "eq", "equivalent", "to", "as", "of", "each", "contains", "with"}


def ascii_lower(s: str) -> str:
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def canon_salt(raw: str) -> str | None:
    s = ascii_lower(raw)
    s = re.sub(r"\([^)]*\)", " ", s)          # parentheticals are qualifiers
    s = re.sub(r"\bi\.p\.?|\bb\.p\.?", " ", s)
    s = re.sub(r"[^a-z0-9\- ]", " ", s)
    words = [w for w in s.split() if w not in NOISE_WORDS]
    if not words:
        return None
    s = " ".join(words)
    s = SALT_ALIASES.get(s, s)
    if s not in NEVER_STRIP:
        words = s.split()
        kept = words[:1] + [w for w in words[1:] if w not in SALT_FORM_WORDS]
        s = " ".join(kept)
    s = SALT_ALIASES.get(s, s)
    return s or None


def build_vocab(cdci_names: list[str]) -> set[str]:
    vocab = {canon_salt(n) for n in cdci_names}
    vocab |= set(SALT_ALIASES.values()) | EXTRA_VOCAB
    vocab.discard(None)
    return vocab


# ----------------------------------------------------------------- strengths

STRENGTH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(mg|mcg|ug|g|gm|iu)\b")


def canon_strength(value: str, unit: str) -> str | None:
    v = float(value)
    if v <= 0:
        return None
    unit = unit.lower()
    if unit in ("mcg", "ug"):
        v, unit = v / 1000, "mg"
    elif unit in ("g", "gm"):
        v, unit = v * 1000, "mg"
    return f"{round(v, 4):g}{unit}"


# ----------------------------------------------------------- form / release

MODIFIED_RE = re.compile(
    r"sustained|prolonged|extended|controlled|modified|slow release|retard|"
    r"\b(sr|er|pr|xr|xl|cr|mr|la|cd|dsr)\b"
)
GASTRO_RE = re.compile(r"gastro|enteric|delayed|\b(ec|dr)\b")
AMBIGUOUS_RE = re.compile(r"\bod\b|\bkit\b|combipack|combikit|vaginal|soluble|sublingual|\bdual\b")
SPECIAL_RELEASES = [
    ("dispersible", re.compile(r"dispersible|\bdt\b")),
    ("mouth-dissolving", re.compile(r"mouth dissolving|orally disintegrating|\b(md|odt)\b")),
    ("chewable", re.compile(r"chewable")),
    ("effervescent", re.compile(r"effervescent")),
]


def detect_form(text: str) -> str | None:
    has_tab = re.search(r"\btab(let)?s?\b", text)
    has_cap = re.search(r"\bcap(sule)?s?\b", text)
    if has_tab and not has_cap:
        return "tablet"
    if has_cap and not has_tab:
        return "capsule"
    return None


def detect_release(text: str) -> str | None:
    """None means 'cannot tell' -- the caller must treat the product as unparsed."""
    if AMBIGUOUS_RE.search(text):
        return None
    found = [name for name, rx in SPECIAL_RELEASES if rx.search(text)]
    if MODIFIED_RE.search(text):
        found.append("modified")
    if len(found) > 1:
        return None
    return found[0] if found else "standard"


def make_key(form, release, pairs, vocab):
    if not form or not release or not pairs:
        return None
    salts = [s for s, _ in pairs]
    if len(set(salts)) != len(salts):
        return None
    if any(s not in vocab for s in salts):
        return None
    return (form, release, tuple(sorted(pairs)))


# ------------------------------------------------------------ Jan Aushadhi

FORM_WORDS_RE = re.compile(
    r"\b(film[\s-]?coated|uncoated|hard|soft|gelatin|gelatine|tablets?|capsules?|tabs?|caps?)\b"
)
RELEASE_WORDS_RE = re.compile(
    r"\b(gastro[\s-]?resistan(t|ce)|enteric[\s-]?coated|delayed[\s-]?release|"
    r"sustained[\s-]?release|prolonged[\s-]?release|extended[\s-]?rel[ea]+se|"
    r"controlled[\s-]?release|modified[\s-]?release|dispersible|chewable|"
    r"effervescent|mouth[\s-]?dissolving|orally[\s-]?disintegrating|"
    r"sr|er|pr|xr|cr|mr|ec|dr)\b"
)


def parse_ja(name: str, vocab: set[str]):
    text = ascii_lower(name)
    form = detect_form(text)
    release = detect_release(text)
    if not form or not release:
        return None

    s = text
    # "Co-trimoxazole (Sulphamethoxazole 800mg and Trimethoprim 160mg)": the
    # parenthetical holding the strengths IS the composition
    m = re.search(r"\(([^()]*\d[^()]*(?:and|\+|,)[^()]*\d[^()]*)\)", s)
    if m and len(STRENGTH_RE.findall(m.group(1))) >= 2:
        s = m.group(1)
    s = re.sub(r"\bi\.?p\.?\b|\bb\.?p\.?\b|\busp\b", " ", s)
    s = RELEASE_WORDS_RE.sub(" ", s)
    s = FORM_WORDS_RE.sub(" ", s)

    # "50/20 mg" -> "50 mg / 20 mg" so every number carries a unit
    s = re.sub(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*(mg|mcg|g|iu)\b", r"\1 \3 / \2 \3", s)
    strengths = [canon_strength(v, u) for v, u in STRENGTH_RE.findall(s)]
    if not strengths or None in strengths:
        return None

    names_text = STRENGTH_RE.sub(" , ", s)
    names_text = re.sub(r"[()]", " ", names_text)
    parts = re.split(r"\band\b|\+|,|/|&", names_text)
    names = [canon_salt(p) for p in parts if re.search(r"[a-z]", p)]
    if None in names or len(names) != len(strengths):
        return None
    if any(re.search(r"\d", n) for n in names):
        return None
    return make_key(form, release, list(zip(names, strengths)), vocab)


def ja_units(unit_size: str) -> int | None:
    m = re.fullmatch(r"(\d+)\s*\W?\s*s", unit_size.strip().lower())
    return int(m.group(1)) if m else None


# --------------------------------------------------------- open dataset (A-Z)

COMPOSITION_RE = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")


def parse_open(row: dict, vocab: set[str]):
    if row["truncated"]:
        return None
    pack = ascii_lower(row["packLabel"])
    name = ascii_lower(row["name"])
    descriptor = re.sub(r"^.*?\bof\s+\d+\s*", "", pack)   # "strip of 15 tablet sr" -> "tablet sr"
    form = detect_form(descriptor) or detect_form(name)
    # Release is read twice: from the pack descriptor plus the name AFTER the
    # form word ("Glycomet-GP 1 Tablet PR"), and from the whole name
    # ("Glycomet 500 SR Tablet"). They must agree. A brand word that happens to
    # look like a release code ("Xyz CD Tablet", pack "strip of 10 tablets")
    # then disagrees and is left unparsed instead of being grouped as modified.
    tail = re.split(r"\b(?:tablet|capsule)s?\b", name, maxsplit=1)
    name_tail = tail[1] if len(tail) > 1 else ""
    release = detect_release(f"{descriptor} {name_tail}")
    if release != detect_release(f"{descriptor} {name}"):
        return None
    if not form or not release:
        return None

    pairs = []
    for comp in row["compositions"]:
        m = COMPOSITION_RE.match(ascii_lower(comp))
        if not m:
            return None
        sm = STRENGTH_RE.fullmatch(m.group(2).strip())
        if not sm:
            return None
        strength = canon_strength(*sm.groups())
        salt = canon_salt(m.group(1))
        if not strength or not salt:
            return None
        pairs.append((salt, strength))
    return make_key(form, release, pairs, vocab)


def open_units(pack_label: str) -> int | None:
    m = re.search(r"\bof\s+(\d+)\s+(?:soft\s+gelatin\s+)?(?:tablet|capsule)", pack_label.lower())
    return int(m.group(1)) if m else None


# ------------------------------------------------------------------- NPPA


def parse_nppa(formulation: str, dosage: str, vocab: set[str]):
    d = ascii_lower(dosage)
    m = re.match(r"^(.*?)\b(tablet|capsule)\b(.*)$", d)
    if not m:
        return None
    form = m.group(2)
    release = detect_release(m.group(1))
    if not release:
        return None
    rest = m.group(3)
    # "600 (a) + 300 mg (b)": a bare number borrows the next unit
    rest = re.sub(r"\(\s*[a-c]\s*\)", " ", rest)
    rest = re.sub(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)\s*(mg|mcg|g|iu)\b", r"\1 \3 + \2 \3", rest)
    nums = re.findall(r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|iu)?", rest)
    filled, pending = [], []
    for v, u in nums:
        pending.append(v)
        if u:
            filled += [(p, u) for p in pending]
            pending = []
    if pending or not filled:
        return None
    strengths = [canon_strength(v, u) for v, u in filled]

    f = re.sub(r"\(\s*[a-c]\s*\)", " ", ascii_lower(formulation))
    names = [canon_salt(p) for p in re.split(r"\+", f) if p.strip()]
    if None in strengths or None in names or len(names) != len(strengths):
        return None
    return make_key(form, release, list(zip(names, strengths)), vocab)


def nppa_unit_ok(form: str, unit: str | None) -> bool:
    return bool(unit) and unit.strip().lower() in (f"1 {form}", f"1 {form}s")


# --------------------------------------------------------------- self-test

if __name__ == "__main__":
    vocab = {"pantoprazole", "domperidone", "metformin", "glimepiride", "aceclofenac",
             "paracetamol", "sulfamethoxazole", "trimethoprim", "atenolol", "nifedipine",
             "amoxicillin", "clavulanic acid", "losartan", "buspirone", "aspirin",
             "telmisartan", "chlorthalidone", "metoprolol succinate", "abacavir", "lamivudine",
             "omeprazole", "esomeprazole", "itopride", "levothyroxine", "lamotrigine"}
    P = lambda *pairs: tuple(sorted(pairs))  # noqa: E731

    ja_cases = {
        "Pantoprazole Gastro Resistant Tablets IP 40 mg": ("tablet", "standard", P(("pantoprazole", "40mg"))),
        "Pantoprazole 40mg (Gastro-resistant) and Domperidone 30mg (Prolonged Release) Capsules IP":
            ("capsule", "modified", P(("pantoprazole", "40mg"), ("domperidone", "30mg"))),
        "Aceclofenac 100mg and Paracetamol 325mg Tablets": ("tablet", "standard", P(("aceclofenac", "100mg"), ("paracetamol", "325mg"))),
        "Metformin 1000mg (Prolonged release) and Glimepiride 3mg Tablets IP":
            ("tablet", "modified", P(("metformin", "1000mg"), ("glimepiride", "3mg"))),
        "Co-trimoxazole (Sulphamethoxazole 800mg and Trimethoprim 160mg) Tablets IP":
            ("tablet", "standard", P(("sulfamethoxazole", "800mg"), ("trimethoprim", "160mg"))),
        "Atenolol + Nifedipine Tablet (50/20 Mg)": ("tablet", "standard", P(("atenolol", "50mg"), ("nifedipine", "20mg"))),
        "Losartan Tablets IP 25mg": ("tablet", "standard", P(("losartan", "25mg"),)),
        "Buspirone Tablet (5 Mg)": ("tablet", "standard", P(("buspirone", "5mg"),)),
        "Aspirin Gastro-resistant Tablets IP 150 mg": ("tablet", "standard", P(("aspirin", "150mg"),)),
        "Metoprolol Succinate (extended release) 25mg and Cilnidipine 10mg Tablets": None,  # cilnidipine not in test vocab
        "Esomeprazole Magnessium 40mg (Enteric Coated ) and Itopride Hydrochloride 150mg (Sustained Release) Capsules.":
            ("capsule", "modified", P(("esomeprazole", "40mg"), ("itopride", "150mg"))),
        "Lamotrigine Dispersible Tablets IP 50mg": ("tablet", "dispersible", P(("lamotrigine", "50mg"),)),
        "Pantoprazole Injection 40mg": None,
        "Combipack of Ambrisentan 5mg and Tadalafil 20mg Tablets": None,
        "Amoxycillin 125Mg , Cloxacillin 125Mg And  Lactic Acid Bacillus 60   Million Spore Tablets": None,
    }
    for name, want in ja_cases.items():
        got = parse_ja(name, vocab)
        assert got == want, f"JA {name!r}\n  got  {got}\n  want {want}"

    def row(name, pack, comps, truncated=False):
        return {"name": name, "packLabel": pack, "compositions": comps, "truncated": truncated}

    open_cases = [
        (row("PAN 40 Tablet", "strip of 15 tablets", ["Pantoprazole (40mg)"]), ("tablet", "standard", P(("pantoprazole", "40mg"),))),
        (row("Pan-D Capsule PR", "strip of 15 capsule pr", ["Domperidone (30mg)", "Pantoprazole (40mg)"]),
         ("capsule", "modified", P(("pantoprazole", "40mg"), ("domperidone", "30mg")))),
        (row("Glycomet 500 SR Tablet", "strip of 20 tablet sr", ["Metformin (500mg)"]), ("tablet", "modified", P(("metformin", "500mg"),))),
        (row("Telma-CT 40 Tablet", "strip of 15 tablets", ["Telmisartan (40mg)", "Chlorthalidone (12.5mg)"]),
         ("tablet", "standard", P(("telmisartan", "40mg"), ("chlorthalidone", "12.5mg")))),
        (row("Zerodol-SP Tablet", "strip of 10 tablets", ["Aceclofenac (100mg)", "Paracetamol (325mg)"], truncated=True), None),
        (row("Thyronorm 50mcg Tablet", "bottle of 120 tablets", ["Thyroxine (50mcg)"]), ("tablet", "standard", P(("levothyroxine", "0.05mg"),))),
        (row("Augmentin 625 Duo Tablet", "strip of 10 tablets", ["Amoxycillin  (500mg)", "Clavulanic Acid (125mg)"]),
         ("tablet", "standard", P(("amoxicillin", "500mg"), ("clavulanic acid", "125mg")))),
        (row("Foo OD Tablet", "strip of 10 tablets", ["Metformin (500mg)"]), None),
    ]
    for r, want in open_cases:
        got = parse_open(r, vocab)
        assert got == want, f"OPEN {r['name']!r}\n  got  {got}\n  want {want}"
    assert open_units("strip of 15 tablets") == 15
    assert open_units("strip of 10 soft gelatin capsules") == 10
    assert ja_units("10's") == 10 and ja_units("7�s") == 7

    nppa_cases = [
        ("ABACAVIR (A)+LAMIVUDINE (B)", "TABLET 600 (A) + 300 MG (B)", ("tablet", "standard", P(("abacavir", "600mg"), ("lamivudine", "300mg")))),
        ("AMOXICILLIN (A) + CLAVULANIC ACID (B)", "TABLET 500 MG (A) +125 MG(B)", ("tablet", "standard", P(("amoxicillin", "500mg"), ("clavulanic acid", "125mg")))),
        ("METFORMIN", "MODIFIED RELEASE TABLET 1000 MG", ("tablet", "modified", P(("metformin", "1000mg"),))),
        ("OMEPRAZOLE", "CAPSULE 20 MG", ("capsule", "standard", P(("omeprazole", "20mg"),))),
        ("PARACETAMOL", "SUSPENSION 120 MG", None),
    ]
    for f, d, want in nppa_cases:
        got = parse_nppa(f, d, vocab)
        assert got == want, f"NPPA {f} {d}\n  got  {got}\n  want {want}"
    assert canon_salt("Potassium Chloride") == "potassium chloride"
    assert canon_salt("Metoprolol Succinate") == "metoprolol succinate"
    assert canon_salt("Losartan Potassium") == "losartan"
    print("medicine_parse self-checks passed")
