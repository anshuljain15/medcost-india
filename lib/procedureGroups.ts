import type { Category } from "./billReports";

// Display grouping for the 61 HexaHealth procedures (the /procedures list and
// the quote checker's combobox), plus the /share-bill category each one
// pre-fills. Display only: a group is a reading aid, never a clinical claim,
// and the procedure name shown is always the source's own.

export type GroupKey =
  | "heart"
  | "bones"
  | "eye"
  | "stomach"
  | "weightLoss"
  | "women"
  | "kidney"
  | "cancer"
  | "general"
  | "entLungs"
  | "cosmetic"
  | "other";

export const GROUP_ORDER: GroupKey[] = [
  "heart",
  "bones",
  "eye",
  "stomach",
  "weightLoss",
  "women",
  "kidney",
  "cancer",
  "general",
  "entLungs",
  "cosmetic",
  "other",
];

type GroupEntry = { group: GroupKey; shareCategory: Category };

function assign(group: GroupKey, shareCategory: Category, slugs: string[]): [string, GroupEntry][] {
  return slugs.map((slug) => [slug, { group, shareCategory }]);
}

export const PROCEDURE_GROUP: Record<string, GroupEntry> = Object.fromEntries([
  ...assign("heart", "cardiac", [
    "angioplasty",
    "coronary-angiography",
    "ct-angiography",
    "heart-bypass-surgery",
    "open-heart-surgery",
  ]),
  ...assign("bones", "orthopaedic", [
    "knee-arthroscopy",
    "knee-replacement-surgery",
    "partial-knee-replacement",
    "total-hip-replacement",
  ]),
  ...assign("eye", "eye", [
    "cataract-surgery",
    "laser-cataract-surgery",
    "contoura-vision",
    "icl-eye-surgery",
    "lasik-surgery",
    "smile-eye-surgery",
  ]),
  ...assign("stomach", "gastro", [
    "laparoscopic-cholecystectomy",
    "open-cholecystectomy",
    "ercp-test",
    "mrcp-test",
    "ascitic-tap",
    "liver-transplant",
    "living-donor-liver-transplantation",
    "orthotopic-liver-transplant",
  ]),
  ...assign("weightLoss", "gastro", [
    "bariatric-surgery",
    "gastric-bypass-surgery",
    "sleeve-gastrectomy-surgery",
    "endoscopic-sleeve-gastroplasty",
    "swallowable-weight-loss-balloon",
  ]),
  ...assign("women", "gynae", [
    "abortion",
    "surgical-abortion",
    "dilatation-and-curettage",
    "fibroid-surgery",
    "hysterectomy",
    "hysteroscopy",
  ]),
  ...assign("kidney", "kidney_urology", [
    "kidney-transplant",
    "dj-stent-removal",
    "laser-circumcision",
    "stapler-circumcision",
  ]),
  ...assign("cancer", "cancer", ["chemotherapy", "radiotherapy"]),
  ...assign("general", "general_surgery", [
    "piles-laser-treatment",
    "piles-stapler-surgery",
    "fissure-laser-surgery",
    "fistula-laser-treatment",
    "laparoscopic-hiatal-hernia-repair",
    "laparoscopic-umbilical-hernia-surgery",
    "umbilical-hernia-surgery",
    "lipoma-removal",
    "varicose-veins-laser-treatment",
    "breast-lump-removal-surgery",
  ]),
  ...assign("entLungs", "ent", ["fess"]),
  ...assign("entLungs", "other", ["bronchoscopy"]),
  ...assign("cosmetic", "other", [
    "breast-augmentation",
    "breast-lift-surgery",
    "breast-reduction-surgery",
    "gynecomastia-surgery",
    "labiaplasty",
    "laser-vaginal-tightening",
    "rhinoplasty",
    "tummy-tuck-surgery",
  ]),
  ...assign("other", "other", ["endovascular-embolization"]),
]);

const UNGROUPED: GroupEntry = { group: "other", shareCategory: "other" };

/** The group and share-bill category for a slug; unlisted slugs fall back to other / other. */
export function procedureGroup(slug: string): GroupEntry {
  return PROCEDURE_GROUP[slug] ?? UNGROUPED;
}
