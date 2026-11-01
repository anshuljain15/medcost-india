// Search-only aliases for the 61 HexaHealth procedure slugs: lay words,
// Hindi and Hinglish, so "घुटना" or "bawasir" finds the right row. Results
// always DISPLAY the source's own procedure name; these strings are never
// shown and are not translations (data text is never translated).
//
// Rules: 2-5 aliases per slug, lowercase, a plain word a patient would type.
// Hindi oblique forms (घुटने, कूल्हे) and filler words ("का ऑपरेशन") are
// handled by components/search/match.ts, so they need no alias of their own.
// Gallstones are "पित्त की पथरी", never a bare "पथरी": kidney stones
// (गुर्दे की पथरी) are a different treatment with no row here.
// Never alias one procedure to another procedure's name (the matcher history
// in CLAUDE.md: "Angioplasty" once matched "Vaginoplasty"). Matching
// normalises with toLowerCase().normalize("NFC") on both sides.

export const SYNONYMS: Record<string, string[]> = {
  // heart
  "angioplasty": ["stent", "स्टेंट", "एंजियोप्लास्टी", "ptca"],
  "coronary-angiography": ["angiogram", "एंजियोग्राफी", "एंजियोग्राम"],
  "ct-angiography": ["ct angiogram", "सीटी एंजियोग्राफी"],
  "heart-bypass-surgery": ["bypass", "बाईपास", "cabg"],
  "open-heart-surgery": ["heart surgery", "दिल का ऑपरेशन", "हार्ट सर्जरी"],

  // bones
  "knee-arthroscopy": ["knee scope", "घुटना", "घुटने की दूरबीन सर्जरी"],
  "knee-replacement-surgery": ["knee", "घुटना", "घुटना बदलना", "ghutna"],
  "partial-knee-replacement": ["knee", "घुटना", "ghutna"],
  "total-hip-replacement": ["hip", "कूल्हा", "कूल्हा बदलना"],

  // eye
  "cataract-surgery": ["मोतियाबिंद", "कैटरेक्ट", "motiyabind", "phaco"],
  "laser-cataract-surgery": ["मोतियाबिंद", "कैटरेक्ट", "motiyabind", "femto cataract"],
  "contoura-vision": ["चश्मा हटाना", "specs removal", "laser eye"],
  "icl-eye-surgery": ["चश्मा हटाना", "specs removal", "lens implant"],
  "lasik-surgery": ["चश्मा हटाना", "specs removal", "laser eye", "लेसिक"],
  "smile-eye-surgery": ["चश्मा हटाना", "specs removal", "laser eye"],

  // stomach and liver
  "laparoscopic-cholecystectomy": ["gallbladder", "पित्त की थैली", "पित्त की पथरी", "pathri", "gallstone"],
  "open-cholecystectomy": ["gallbladder", "पित्त की थैली", "पित्त की पथरी", "pathri", "gallstone"],
  "ercp-test": ["ईआरसीपी", "bile duct", "पित्त की नली"],
  "mrcp-test": ["एमआरसीपी", "bile duct mri", "पित्त की नली"],
  "ascitic-tap": ["paracentesis", "पेट का पानी निकालना"],
  "liver-transplant": ["लिवर", "लिवर ट्रांसप्लांट", "जिगर"],
  "living-donor-liver-transplantation": ["लिवर", "liver transplant", "जिगर"],
  "orthotopic-liver-transplant": ["लिवर", "liver transplant", "जिगर"],

  // weight loss
  "bariatric-surgery": ["weight loss", "मोटापा", "motapa", "obesity surgery"],
  "gastric-bypass-surgery": ["weight loss", "मोटापा", "motapa"],
  "sleeve-gastrectomy-surgery": ["weight loss", "मोटापा", "motapa"],
  "endoscopic-sleeve-gastroplasty": ["weight loss", "मोटापा", "esg"],
  "swallowable-weight-loss-balloon": ["weight loss", "मोटापा", "gastric balloon"],

  // women's health
  "abortion": ["गर्भपात", "garbhpat", "mtp"],
  "surgical-abortion": ["गर्भपात", "garbhpat", "mtp"],
  "dilatation-and-curettage": ["d&c", "d and c", "बच्चेदानी की सफाई"],
  "fibroid-surgery": ["myomectomy", "रसौली", "बच्चेदानी की गांठ"],
  "hysterectomy": ["uterus removal", "बच्चेदानी", "बच्चेदानी निकालना"],
  "hysteroscopy": ["uterus scope", "बच्चेदानी की दूरबीन जाँच"],

  // kidney and urology
  "kidney-transplant": ["किडनी", "गुर्दा", "किडनी ट्रांसप्लांट"],
  "dj-stent-removal": ["stent removal", "स्टेंट निकालना"],
  "laser-circumcision": ["खतना", "khatna"],
  "stapler-circumcision": ["खतना", "khatna"],

  // cancer
  "chemotherapy": ["chemo", "कीमो", "कैंसर"],
  "radiotherapy": ["सिकाई", "radiation", "रेडिएशन", "कैंसर"],

  // general surgery
  "piles-laser-treatment": ["बवासीर", "bawasir", "piles", "hemorrhoids"],
  "piles-stapler-surgery": ["बवासीर", "bawasir", "hemorrhoids"],
  "fissure-laser-surgery": ["फ़िशर", "फिशर", "anal fissure"],
  "fistula-laser-treatment": ["भगंदर", "bhagandar", "anal fistula"],
  "laparoscopic-hiatal-hernia-repair": ["हर्निया", "hiatus hernia"],
  "laparoscopic-umbilical-hernia-surgery": ["हर्निया", "नाभि का हर्निया", "navel hernia"],
  "umbilical-hernia-surgery": ["हर्निया", "नाभि का हर्निया", "navel hernia"],
  "lipoma-removal": ["fatty lump", "चर्बी की गांठ", "गांठ"],
  "varicose-veins-laser-treatment": ["varicose", "फूली हुई नसें", "evlt"],
  "breast-lump-removal-surgery": ["breast lump", "lumpectomy", "स्तन की गांठ"],

  // ENT and lungs
  "fess": ["sinus surgery", "साइनस", "sinus"],
  "bronchoscopy": ["फेफड़े की दूरबीन जाँच", "lung scope"],

  // cosmetic
  "breast-augmentation": ["breast implants", "स्तन"],
  "breast-lift-surgery": ["mastopexy", "स्तन"],
  "breast-reduction-surgery": ["reduction mammoplasty", "स्तन"],
  "gynecomastia-surgery": ["gynaecomastia", "male breast reduction"],
  "labiaplasty": ["labioplasty", "labia reduction"],
  "laser-vaginal-tightening": ["vaginal tightening", "vaginal rejuvenation"],
  "rhinoplasty": ["nose job", "नाक की सर्जरी"],
  "tummy-tuck-surgery": ["abdominoplasty", "tummy tightening"],

  // other
  "endovascular-embolization": ["embolisation", "coiling"],
};

/** Aliases for one slug ([] when it has none). */
export function synonymsFor(slug: string): string[] {
  return SYNONYMS[slug] ?? [];
}
