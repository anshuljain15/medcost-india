export type Locale = "en" | "hi";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
];

// Only static UI chrome is translated here — hospital names, addresses,
// procedure names, and CGHS/HexaHealth line-item text stay in their
// original language. Auto-translating medical procedure names carries the
// same risk as the fuzzy-matching mistakes documented in the pipeline:
// a wrong translation of a procedure name is worse than showing English.
export const translations = {
  en: {
    nav: {
      procedures: "Procedures",
      hospitals: "Hospitals",
      rates: "Rate Explorer",
      methodology: "Methodology",
      medicines: "Medicines",
      kendras: "Jan Aushadhi stores",
      findPrice: "Find a price",
    },
    footer: {
      tagline:
        "Every price on this site is a range with a visible source and date — never a single made-up number.",
      explore: "Explore",
      about: "About",
      credit: "Built by Anshul",
    },
    home: {
      eyebrow: "Bangalore pricing pilot",
      title: "Know what a procedure should cost, before you walk into a hospital.",
      subtitle:
        "Search a procedure to see a government reference rate, a market range, and — where we have it — a hospital-by-hospital price comparison.",
      statProcedures: "{n} procedures priced",
      statHospitals: "2,684 network hospitals",
      statCities: "{n} cities",
      exampleEyebrow: "Example — real data",
      exampleTitleSuffix: "in Bangalore",
      marketRange: "Market range",
      sourceHexaHealth: "Source: HexaHealth",
      hospitalsPriced: "Hospitals priced",
      namedHospitals: "Named hospitals in this range",
      govReference: "Government (CGHS) reference",
      notAvailable: "Not available",
      tierNote: "Tier I, NABH, general ward",
      seeComparison: "See the full hospital comparison →",
      featuresHeading: "How this is different from a listing site",
      features: [
        {
          title: "Government reference rates",
          body: "Every priced procedure is checked against the CGHS Tier I rate — the same benchmark the government uses for its own hospital reimbursements.",
        },
        {
          title: "Real hospital-wise ranges",
          body: "Where the data exists, prices are shown per hospital, not just per city — so you can see how one hospital compares to another for the same procedure.",
        },
        {
          title: "No point claims, ever",
          body: "Every number is a range with a visible source and date. We never publish a single made-up figure for what a hospital “charges.”",
        },
        {
          title: "One rate per procedure",
          body: "Unlike US price transparency data, Indian pricing isn’t split by insurance plan or payer — just a procedure and a rate, which is what we show.",
        },
        {
          title: "2,684 network hospitals",
          body: "A directory of cashless-network hospitals across six metros, mapped and searchable, with bed and ICU capacity where available.",
        },
        {
          title: "Built to be corrected",
          body: "Every hospital and rate page carries a methodology link and a correction channel. If something’s wrong, we want to know.",
        },
      ],
      ctaHeading: "Browse the full hospital directory",
      ctaBody:
        "2,684 network hospitals across Bangalore, Delhi, Mumbai, Pune, Chennai and Hyderabad — mapped, searchable, and free to browse.",
      ctaButton: "Browse hospitals",
      searchPlaceholder: "Search a procedure — e.g. Knee Replacement, Kidney Transplant...",
      searchNoMatch: 'No priced procedures match "{q}" yet.',
    },
    procedures: {
      title: "Procedures priced in Bangalore",
      subtitle:
        "{n} procedures with a market price range, sourced from HexaHealth and checked against the CGHS government reference rate where a confident match exists.",
      filterPlaceholder: "Filter procedures...",
      hospitalsPricedBadge: "{n} hospitals priced",
      cghsReferenceBadge: "CGHS reference",
      noMatch: 'No procedures match "{q}".',
    },
    procedure: {
      back: "← All procedures",
      titleSuffix: "in Bangalore",
      marketRange: "Market range",
      sourceLabel: "Source:",
      editorialNote: "— editorial market estimate, not a billed amount.",
      govRefTitle: "Government (CGHS) reference — Tier I",
      generalWardNabh: "general ward, NABH",
      matchedLine: "Matched CGHS line item:",
      wardBreakdown: "Semi-private {sp}, private {p}.",
      noCghsMatch:
        "No confident CGHS government reference match for this procedure. We only show a match when we’re sure it refers to the same procedure — see",
      methodologyLink: "methodology",
      comparisonHeading: "Hospital-wise price comparison",
      noHospitalData:
        "No hospital-specific breakdown is available for this procedure yet — only the city-wide market range above.",
      colHospital: "Hospital",
      colMin: "Min",
      colAvg: "Avg",
      colMax: "Max",
      footerNote:
        "These are editorial market estimates, not confirmed billed amounts — treat them as a starting point for comparison, not a quote.",
    },
    rates: {
      eyebrow: "Rate Explorer",
      title: "CGHS government reference rates — Tier I (Bangalore)",
      subtitle:
        "{n} line items across {m} specialties, pulled directly from the Central Government Health Scheme rate list. These are reimbursement rates the government pays, not necessarily what a private hospital charges — but they’re the most consistent public benchmark available for India.",
      searchPlaceholder: "Search by procedure name or CGHS code...",
      allSpecialties: "All specialties",
      promptSearch:
        "Search for a procedure or pick a specialty to see rates — {n} rows isn’t something you want to scroll through blind.",
      matchingRows: "{n} matching rows",
      colCode: "Code",
      colProcedure: "Procedure",
      colNabh: "NABH",
      colGeneral: "General",
      colSemiPrivate: "Semi-private",
      colPrivate: "Private",
      loadMore: "Load {n} more",
    },
    hospitals: {
      title: "Browse hospitals by city",
      subtitle: "2,684 hospitals from the Bajaj Allianz cashless network directory, across six metros.",
      count: "{n} hospitals",
    },
    city: {
      titleSuffix: "network hospitals",
      subtitle: "{n} hospitals in the Bajaj Allianz cashless network.",
      searchPlaceholder: "Search by hospital name, area, or PIN code...",
      shownCount: "{shown} of {total} shown",
      noMatch: "No hospitals match.",
    },
    hospital: {
      backTo: "← Back to {city}",
      networkType: "Network type",
      bedCount: "Bed count",
      icuBeds: "ICU beds",
      phone: "Phone",
      pincode: "Pincode",
      rohiniCode: "Rohini code",
      proceduresHeading: "Procedures priced at this hospital",
      procedureColumn: "Procedure",
      noProceduresPre: "No procedure pricing linked to this specific hospital yet — browse",
      allProcedures: "all priced procedures",
      noProceduresPost: "for Bangalore market ranges.",
      kendrasHeading: "Jan Aushadhi stores near this hospital",
      kendrasSamePin: "Same PIN code ({pin})",
      kendrasSameArea: "Same postal area (PIN {area}xxx)",
      kendrasNone: "No Jan Aushadhi Kendra is listed in this hospital's postal area.",
      kendrasNoPin: "This hospital has no PIN code on file, so we can't list stores near it.",
      kendrasFindMore: "Search stores by PIN",
      kendrasMedicines: "Compare medicine prices",
    },
    medicines: {
      eyebrow: "Medicine prices",
      title: "Find a cheaper version of the same medicine.",
      subtitle:
        "Search a brand (Pan 40, Dolo 650) or a salt (pantoprazole). We show the government Jan Aushadhi generic with the same salt, strength and form, the NPPA ceiling price where one exists, and the cheapest brands.",
      searchPlaceholder: "Brand or salt, e.g. Pan 40 or pantoprazole",
      searchHint: "Type at least 3 letters.",
      searching: "Searching…",
      noResults: "No tablet or capsule matching “{q}” has a Jan Aushadhi or NPPA price in our data yet.",
      kindGroup: "Medicine",
      kindBrand: "Brand",
      perUnitBrand: "{price} per unit (2022)",
      perUnitJa: "Jan Aushadhi {price} per unit",
      noJaPrice: "No Jan Aushadhi price",
      coverage:
        "Covers {n} tablet and capsule compositions that have a Jan Aushadhi product or an NPPA ceiling price. Syrups, injections and creams aren't included yet.",
      findKendra: "Find a Jan Aushadhi store near you →",
      back: "← All medicines",
      contains: "Contains",
      form: { tablet: "Tablet", capsule: "Capsule" },
      release: {
        standard: "Standard release",
        modified: "Sustained / extended release",
        dispersible: "Dispersible",
        "mouth-dissolving": "Mouth-dissolving",
        chewable: "Chewable",
        effervescent: "Effervescent",
      },
      savingsLine:
        "The Jan Aushadhi generic costs {ja} per {unit}; the median brand was {brand} per {unit} in 2022. That's about {pct}% less.",
      savingsCaveat: "The two prices are from different years, so treat the saving as approximate.",
      unit: { tablet: "tablet", capsule: "capsule" },
      jaHeading: "Jan Aushadhi generic",
      jaPack: "Pack: {size} · MRP {mrp}",
      jaPerUnit: "{price} per {unit}",
      jaNoPrice: "Listed by PMBJP without a published price.",
      jaSource: "Source: PMBJP product list, {date}.",
      jaNone: "No Jan Aushadhi product with exactly this composition.",
      nppaHeading: "Government ceiling price (NPPA)",
      nppaPrice: "{price} per {unit}, excluding GST",
      nppaSource: "S.O. {so} dated {date} · NLEM {nlem}",
      nppaExplain: "No brand may legally charge more than this (plus GST).",
      nppaNone: "Not under NPPA price control. Brands set their own price.",
      brandsHeading: "Brands with the same composition",
      brandsShowing: "Cheapest {shown} of {total} brands.",
      brandsSource: "Listed MRP from the {name}, {date} snapshot ({license}). Today's price may differ.",
      brandsNone: "We have no brand prices for this composition.",
      colBrand: "Brand",
      colMaker: "Manufacturer",
      colPack: "Pack",
      colPackPrice: "Pack MRP",
      colPerUnit: "Per unit",
      relatedStrengths: "Same salts, different strength",
      relatedExtraSalt: "Same salts plus another medicine",
      relatedNote: "These are different medicines. Only your doctor can say whether one can replace another.",
      disclaimer:
        "For information only, not medical advice. Check the composition printed on your strip, and ask your doctor or pharmacist before switching medicines.",
      methodologyLink: "How we match medicines",
      scan: {
        button: "Read a prescription or strip photo",
        privacy: "The photo is read on your device and never uploaded.",
        reading: "Reading the photo… ({pct}%)",
        loading: "Loading the text reader…",
        found: "Words we could read. Tap one to search it:",
        nothing: "We couldn't read any medicine names. Try a clearer, well-lit photo of printed text.",
        handwriting: "Works best on printed strips and pharmacy bills. Handwriting is usually not readable.",
        failed: "The text reader couldn't load. Type the medicine name instead.",
      },
    },
    kendras: {
      title: "Find a Jan Aushadhi store",
      subtitle:
        "Pradhan Mantri Bhartiya Janaushadhi Kendras sell government generic medicines at fixed low prices. Enter a 6-digit PIN code to list stores in that postal area.",
      pinPlaceholder: "6-digit PIN code",
      search: "Search",
      invalidPin: "Enter a valid 6-digit PIN code.",
      results: "{n} stores in postal area {area}xxx, nearest PIN first",
      none: "No stores listed in postal area {area}xxx.",
      samePin: "Same PIN",
      source:
        "Source: PMBJP Kendra list, {date} ({n} stores in our data). Check the official store locator before travelling.",
      official: "Official store locator",
      coverageGap:
        "Some states and UTs (e.g. Haryana, Punjab, the North-East except Assam and Arunachal) are not in our copy of the list yet.",
    },
    reviews: {
      heading: "Patient reviews",
      countLabel: "{n} reviews on Google",
      viewOnGoogle: "View on Google Maps",
      viewReview: "View this review on Google Maps",
      summaryLabel: "AI summary of these reviews",
      summaryDisclaimer:
        "Written by an AI model from the reviews below, which are patients' own words. It can be wrong — read the reviews.",
      source: "Source: Google reviews. Authors retain their own words.",
      sourceDated:
        "Source: Google reviews, fetched {date}. Authors retain their own words.",
    },
    methodology: {
      title: "Methodology & sources",
      intro:
        "This site never publishes a single point price for a hospital. Every number is a range, tagged with its source and the date it was observed, so you can judge how much to trust it. Unlike US price transparency data, Indian hospital pricing isn’t split by insurance plan or payer — a procedure has one rate, not a different negotiated rate per insurer, so that’s all we show.",
      dirHeading: "Hospital directory",
      dirBody:
        "The 2,684-hospital directory (Bangalore, Delhi, Mumbai, Pune, Chennai, Hyderabad) is adapted from Bajaj Allianz’s public network-hospital locator, which lists cashless-network hospitals along with bed counts, ICU capacity, and network status.",
      govHeading: "Government reference rates",
      govBody1:
        "The Rate Explorer and every procedure page’s “CGHS reference” figure comes directly from the Central Government Health Scheme’s published rate list — Tier I, which is Bangalore’s tier, split by NABH accreditation and ward type. These are reimbursement rates the government pays, not necessarily what a private hospital charges in cash, but they’re an official, consistent benchmark.",
      govBody2:
        "We only show a CGHS match when we’re confident it refers to the same procedure. A generic single word (like “Angioplasty”) that could mean several clinically different CGHS line items (coronary, peripheral, or renal) is shown as no match rather than a guess — we’d rather show nothing than show something misleading.",
      marketHeading: "Market price estimates",
      marketBody1:
        "City-level ranges and, where available, hospital-by-hospital breakdowns come from HexaHealth’s published cost pages. These are editorial market estimates compiled by HexaHealth, not confirmed billed amounts — every page links back to the original source.",
      marketBody2:
        "Hospital names from HexaHealth are only linked to a specific entry in our own directory when the match is exact after removing formatting noise (branding, punctuation, city name). Hospital chains often have several branches in the same city with very different prices, so a fuzzy or partial match risks attributing a price to the wrong branch — we treat that as worse than not linking at all, and show the hospital name as plain text instead.",
      nextHeading: "What’s next",
      nextBody:
        "Karnataka’s KPME registry publishes statutory, per-establishment rate filings — the closest thing to real hospital-specific pricing available in India. We’re evaluating whether enough hospitals have actually filed usable rate cards before building it into this site.",
      medHeading: "Medicine prices",
      medBody1:
        "Medicines are grouped only when salts, strengths, form (tablet or capsule) and release type are all exactly the same. Sustained-release never groups with ordinary tablets, and a brand that lists only part of its composition is left out rather than guessed. Salt forms are reduced to the active medicine (pantoprazole sodium → pantoprazole), except where the salt changes the product, such as metoprolol succinate vs tartrate.",
      medBody2:
        "Jan Aushadhi prices come from the PMBJP product list. Ceiling prices come from NPPA's notified list and exclude GST. Brand prices are listed MRPs from the A-Z Medicine Dataset of India (Kaggle, CC BY-SA 4.0), a November 2022 snapshot. They are shown with that date and are not current shop prices. The medicine data on this site is shared under the same CC BY-SA 4.0 licence. Salt names are checked against NRCeS Common Drug Codes for India (C-DAC, CC BY 4.0).",
      medBody3:
        "Jan Aushadhi store addresses come from the PMBJP Kendra list. We don't show the operator's personal name. The list has no map coordinates, so stores are found by PIN code, not by distance.",
      correctionsHeading: "Corrections",
      correctionsBody:
        "If you run a hospital listed here and believe something is inaccurate or out of date, we want to fix it quickly. A correction channel will be linked from every hospital page once the contribution flow ships.",
    },
  },
  hi: {
    nav: {
      procedures: "प्रक्रियाएं",
      hospitals: "अस्पताल",
      rates: "दर एक्सप्लोरर",
      methodology: "पद्धति",
      medicines: "दवाइयां",
      kendras: "जन औषधि केंद्र",
      findPrice: "कीमत खोजें",
    },
    footer: {
      tagline:
        "इस साइट पर हर कीमत एक सीमा है जिसका स्रोत और तारीख स्पष्ट है — कभी भी कोई मनगढ़ंत संख्या नहीं।",
      explore: "एक्सप्लोर करें",
      about: "बारे में",
      credit: "अंशुल द्वारा निर्मित",
    },
    home: {
      eyebrow: "बैंगलोर मूल्य निर्धारण पायलट",
      title: "अस्पताल जाने से पहले जानें कि किसी प्रक्रिया की लागत कितनी होनी चाहिए।",
      subtitle:
        "सरकारी संदर्भ दर, बाजार सीमा, और — जहां उपलब्ध हो — अस्पताल-दर-अस्पताल मूल्य तुलना देखने के लिए एक प्रक्रिया खोजें।",
      statProcedures: "{n} प्रक्रियाओं की कीमत उपलब्ध",
      statHospitals: "2,684 नेटवर्क अस्पताल",
      statCities: "{n} शहर",
      exampleEyebrow: "उदाहरण — वास्तविक डेटा",
      exampleTitleSuffix: "बैंगलोर में",
      marketRange: "बाजार सीमा",
      sourceHexaHealth: "स्रोत: HexaHealth",
      hospitalsPriced: "मूल्य वाले अस्पताल",
      namedHospitals: "इस सीमा में नामित अस्पताल",
      govReference: "सरकारी (CGHS) संदर्भ",
      notAvailable: "उपलब्ध नहीं",
      tierNote: "टियर I, NABH, सामान्य वार्ड",
      seeComparison: "पूरी अस्पताल तुलना देखें →",
      featuresHeading: "यह एक साधारण लिस्टिंग साइट से कैसे अलग है",
      features: [
        {
          title: "सरकारी संदर्भ दरें",
          body: "हर मूल्य वाली प्रक्रिया की जांच CGHS टियर I दर से की जाती है — वही मानक जो सरकार अपने अस्पताल प्रतिपूर्ति के लिए उपयोग करती है।",
        },
        {
          title: "वास्तविक अस्पताल-वार सीमाएं",
          body: "जहां डेटा उपलब्ध है, कीमतें प्रति शहर नहीं बल्कि प्रति अस्पताल दिखाई जाती हैं — ताकि आप एक ही प्रक्रिया के लिए अस्पतालों की तुलना कर सकें।",
        },
        {
          title: "कभी भी अनुमानित दावे नहीं",
          body: "हर संख्या एक सीमा है जिसका स्रोत और तारीख स्पष्ट है। हम कभी भी किसी अस्पताल के “शुल्क” के लिए एक मनगढ़ंत आंकड़ा प्रकाशित नहीं करते।",
        },
        {
          title: "प्रति प्रक्रिया एक ही दर",
          body: "अमेरिकी मूल्य पारदर्शिता डेटा के विपरीत, भारतीय मूल्य निर्धारण बीमा योजना या भुगतानकर्ता के अनुसार विभाजित नहीं है — बस एक प्रक्रिया और एक दर, जो हम दिखाते हैं।",
        },
        {
          title: "2,684 नेटवर्क अस्पताल",
          body: "छह महानगरों में कैशलेस-नेटवर्क अस्पतालों की एक निर्देशिका, मैप की गई और खोजने योग्य, जहां उपलब्ध हो वहां बेड और ICU क्षमता के साथ।",
        },
        {
          title: "सुधार के लिए बनाया गया",
          body: "हर अस्पताल और दर पृष्ठ पर एक पद्धति लिंक और सुधार चैनल है। अगर कुछ गलत है, तो हम जानना चाहते हैं।",
        },
      ],
      ctaHeading: "पूरी अस्पताल निर्देशिका ब्राउज़ करें",
      ctaBody:
        "बैंगलोर, दिल्ली, मुंबई, पुणे, चेन्नई और हैदराबाद में 2,684 नेटवर्क अस्पताल — मैप किए गए, खोजने योग्य, और मुफ्त ब्राउज़िंग के लिए।",
      ctaButton: "अस्पताल ब्राउज़ करें",
      searchPlaceholder: "एक प्रक्रिया खोजें — जैसे घुटना प्रतिस्थापन, किडनी प्रत्यारोपण...",
      searchNoMatch: '"{q}" से मेल खाती कोई मूल्य वाली प्रक्रिया अभी उपलब्ध नहीं है।',
    },
    procedures: {
      title: "बैंगलोर में मूल्य वाली प्रक्रियाएं",
      subtitle:
        "{n} प्रक्रियाएं जिनकी बाजार मूल्य सीमा है, HexaHealth से प्राप्त और जहां विश्वसनीय मिलान मौजूद है वहां CGHS सरकारी संदर्भ दर से जांची गई।",
      filterPlaceholder: "प्रक्रियाएं फ़िल्टर करें...",
      hospitalsPricedBadge: "{n} अस्पतालों की कीमत",
      cghsReferenceBadge: "CGHS संदर्भ",
      noMatch: '"{q}" से कोई प्रक्रिया मेल नहीं खाती।',
    },
    procedure: {
      back: "← सभी प्रक्रियाएं",
      titleSuffix: "बैंगलोर में",
      marketRange: "बाजार सीमा",
      sourceLabel: "स्रोत:",
      editorialNote: "— संपादकीय बाजार अनुमान, बिल की गई राशि नहीं।",
      govRefTitle: "सरकारी (CGHS) संदर्भ — टियर I",
      generalWardNabh: "सामान्य वार्ड, NABH",
      matchedLine: "मिलान किया गया CGHS लाइन आइटम:",
      wardBreakdown: "सेमी-प्राइवेट {sp}, प्राइवेट {p}।",
      noCghsMatch:
        "इस प्रक्रिया के लिए कोई विश्वसनीय CGHS सरकारी संदर्भ मिलान नहीं है। हम केवल तभी मिलान दिखाते हैं जब हमें यकीन हो कि यह वही प्रक्रिया है — देखें",
      methodologyLink: "पद्धति",
      comparisonHeading: "अस्पताल-वार मूल्य तुलना",
      noHospitalData:
        "इस प्रक्रिया के लिए अभी अस्पताल-विशिष्ट विवरण उपलब्ध नहीं है — केवल ऊपर शहर-व्यापी बाजार सीमा।",
      colHospital: "अस्पताल",
      colMin: "न्यूनतम",
      colAvg: "औसत",
      colMax: "अधिकतम",
      footerNote:
        "ये संपादकीय बाजार अनुमान हैं, पुष्ट बिल की गई राशि नहीं — इन्हें तुलना के लिए एक शुरुआती बिंदु मानें, उद्धरण नहीं।",
    },
    rates: {
      eyebrow: "दर एक्सप्लोरर",
      title: "CGHS सरकारी संदर्भ दरें — टियर I (बैंगलोर)",
      subtitle:
        "{m} विशेषताओं में {n} लाइन आइटम, सीधे केंद्रीय सरकार स्वास्थ्य योजना दर सूची से लिए गए। ये सरकार द्वारा भुगतान की जाने वाली प्रतिपूर्ति दरें हैं, जरूरी नहीं कि निजी अस्पताल जो शुल्क लेता है — लेकिन ये भारत के लिए उपलब्ध सबसे सुसंगत सार्वजनिक मानक हैं।",
      searchPlaceholder: "प्रक्रिया नाम या CGHS कोड से खोजें...",
      allSpecialties: "सभी विशेषताएं",
      promptSearch:
        "दरें देखने के लिए किसी प्रक्रिया को खोजें या विशेषता चुनें — {n} पंक्तियां बिना खोजे स्क्रॉल करने लायक नहीं हैं।",
      matchingRows: "{n} मेल खाती पंक्तियां",
      colCode: "कोड",
      colProcedure: "प्रक्रिया",
      colNabh: "NABH",
      colGeneral: "सामान्य",
      colSemiPrivate: "सेमी-प्राइवेट",
      colPrivate: "प्राइवेट",
      loadMore: "{n} और लोड करें",
    },
    hospitals: {
      title: "शहर के अनुसार अस्पताल ब्राउज़ करें",
      subtitle: "छह महानगरों में Bajaj Allianz कैशलेस नेटवर्क निर्देशिका से 2,684 अस्पताल।",
      count: "{n} अस्पताल",
    },
    city: {
      titleSuffix: "नेटवर्क अस्पताल",
      subtitle: "Bajaj Allianz कैशलेस नेटवर्क में {n} अस्पताल।",
      searchPlaceholder: "अस्पताल के नाम, क्षेत्र, या पिन कोड से खोजें...",
      shownCount: "{total} में से {shown} दिखाए गए",
      noMatch: "कोई अस्पताल मेल नहीं खाता।",
    },
    hospital: {
      backTo: "← {city} पर वापस जाएं",
      networkType: "नेटवर्क प्रकार",
      bedCount: "बेड की संख्या",
      icuBeds: "ICU बेड",
      phone: "फ़ोन",
      pincode: "पिनकोड",
      rohiniCode: "रोहिणी कोड",
      proceduresHeading: "इस अस्पताल में मूल्य वाली प्रक्रियाएं",
      procedureColumn: "प्रक्रिया",
      noProceduresPre: "अभी इस विशेष अस्पताल से जुड़ी कोई प्रक्रिया मूल्य निर्धारण नहीं है — ब्राउज़ करें",
      allProcedures: "सभी मूल्य वाली प्रक्रियाएं",
      noProceduresPost: "बैंगलोर बाजार सीमाओं के लिए।",
      kendrasHeading: "इस अस्पताल के पास जन औषधि केंद्र",
      kendrasSamePin: "वही पिन कोड ({pin})",
      kendrasSameArea: "वही डाक क्षेत्र (पिन {area}xxx)",
      kendrasNone: "इस अस्पताल के डाक क्षेत्र में कोई जन औषधि केंद्र सूचीबद्ध नहीं है।",
      kendrasNoPin: "इस अस्पताल का पिन कोड दर्ज नहीं है, इसलिए हम इसके पास के केंद्र नहीं दिखा सकते।",
      kendrasFindMore: "पिन से केंद्र खोजें",
      kendrasMedicines: "दवाओं की कीमतें तुलना करें",
    },
    medicines: {
      eyebrow: "दवाओं की कीमतें",
      title: "उसी दवा का सस्ता विकल्प खोजें।",
      subtitle:
        "कोई ब्रांड (Pan 40, Dolo 650) या साल्ट (pantoprazole) खोजें। हम उसी साल्ट, ताकत और रूप वाली सरकारी जन औषधि जेनेरिक, जहां लागू हो वहां NPPA का अधिकतम मूल्य, और सबसे सस्ते ब्रांड दिखाते हैं।",
      searchPlaceholder: "ब्रांड या साल्ट, जैसे Pan 40 या pantoprazole",
      searchHint: "कम से कम 3 अक्षर लिखें।",
      searching: "खोज रहे हैं…",
      noResults: "“{q}” से मेल खाती किसी गोली या कैप्सूल की जन औषधि या NPPA कीमत अभी हमारे डेटा में नहीं है।",
      kindGroup: "दवा",
      kindBrand: "ब्रांड",
      perUnitBrand: "{price} प्रति यूनिट (2022)",
      perUnitJa: "जन औषधि {price} प्रति यूनिट",
      noJaPrice: "जन औषधि कीमत नहीं",
      coverage:
        "इसमें {n} गोली और कैप्सूल संरचनाएं शामिल हैं जिनका जन औषधि उत्पाद या NPPA अधिकतम मूल्य है। सिरप, इंजेक्शन और क्रीम अभी शामिल नहीं हैं।",
      findKendra: "अपने पास जन औषधि केंद्र खोजें →",
      back: "← सभी दवाइयां",
      contains: "संरचना",
      form: { tablet: "गोली", capsule: "कैप्सूल" },
      release: {
        standard: "सामान्य रिलीज़",
        modified: "धीमी / विस्तारित रिलीज़",
        dispersible: "घुलनशील",
        "mouth-dissolving": "मुंह में घुलने वाली",
        chewable: "चबाने वाली",
        effervescent: "पानी में घुलने वाली (इफ़रवेसेंट)",
      },
      savingsLine:
        "जन औषधि जेनेरिक की कीमत {ja} प्रति {unit} है; 2022 में मीडियन ब्रांड {brand} प्रति {unit} था। यानी लगभग {pct}% कम।",
      savingsCaveat: "दोनों कीमतें अलग-अलग वर्षों की हैं, इसलिए बचत को अनुमानित मानें।",
      unit: { tablet: "गोली", capsule: "कैप्सूल" },
      jaHeading: "जन औषधि जेनेरिक",
      jaPack: "पैक: {size} · MRP {mrp}",
      jaPerUnit: "{price} प्रति {unit}",
      jaNoPrice: "PMBJP ने इसे बिना प्रकाशित कीमत के सूचीबद्ध किया है।",
      jaSource: "स्रोत: PMBJP उत्पाद सूची, {date}।",
      jaNone: "ठीक इसी संरचना वाला कोई जन औषधि उत्पाद नहीं है।",
      nppaHeading: "सरकारी अधिकतम मूल्य (NPPA)",
      nppaPrice: "{price} प्रति {unit}, GST को छोड़कर",
      nppaSource: "S.O. {so}, दिनांक {date} · NLEM {nlem}",
      nppaExplain: "कोई भी ब्रांड कानूनन इससे अधिक (GST के अलावा) नहीं ले सकता।",
      nppaNone: "NPPA मूल्य नियंत्रण में नहीं। ब्रांड अपनी कीमत खुद तय करते हैं।",
      brandsHeading: "समान संरचना वाले ब्रांड",
      brandsShowing: "{total} में से सबसे सस्ते {shown} ब्रांड।",
      brandsSource: "{name} से सूचीबद्ध MRP, {date} स्नैपशॉट ({license})। आज की कीमत अलग हो सकती है।",
      brandsNone: "इस संरचना के लिए हमारे पास ब्रांड कीमतें नहीं हैं।",
      colBrand: "ब्रांड",
      colMaker: "निर्माता",
      colPack: "पैक",
      colPackPrice: "पैक MRP",
      colPerUnit: "प्रति यूनिट",
      relatedStrengths: "वही साल्ट, अलग ताकत",
      relatedExtraSalt: "वही साल्ट और एक अन्य दवा",
      relatedNote: "ये अलग दवाइयां हैं। केवल आपके डॉक्टर बता सकते हैं कि एक दूसरी की जगह ले सकती है या नहीं।",
      disclaimer:
        "केवल जानकारी के लिए, चिकित्सा सलाह नहीं। अपनी स्ट्रिप पर छपी संरचना जांचें, और दवा बदलने से पहले अपने डॉक्टर या फार्मासिस्ट से पूछें।",
      methodologyLink: "हम दवाओं का मिलान कैसे करते हैं",
      scan: {
        button: "पर्चे या स्ट्रिप की फ़ोटो पढ़ें",
        privacy: "फ़ोटो आपके डिवाइस पर ही पढ़ी जाती है और कभी अपलोड नहीं होती।",
        reading: "फ़ोटो पढ़ रहे हैं… ({pct}%)",
        loading: "टेक्स्ट रीडर लोड हो रहा है…",
        found: "जो शब्द हम पढ़ सके। खोजने के लिए किसी पर टैप करें:",
        nothing: "हम कोई दवा का नाम नहीं पढ़ सके। छपे हुए टेक्स्ट की साफ़, अच्छी रोशनी वाली फ़ोटो आज़माएं।",
        handwriting: "छपी स्ट्रिप और फ़ार्मेसी बिल पर सबसे अच्छा काम करता है। हाथ की लिखावट आमतौर पर पढ़ी नहीं जा सकती।",
        failed: "टेक्स्ट रीडर लोड नहीं हो सका। इसके बजाय दवा का नाम लिखें।",
      },
    },
    kendras: {
      title: "जन औषधि केंद्र खोजें",
      subtitle:
        "प्रधानमंत्री भारतीय जनऔषधि केंद्र तय कम कीमतों पर सरकारी जेनेरिक दवाइयां बेचते हैं। उस डाक क्षेत्र के केंद्र देखने के लिए 6 अंकों का पिन कोड डालें।",
      pinPlaceholder: "6 अंकों का पिन कोड",
      search: "खोजें",
      invalidPin: "सही 6 अंकों का पिन कोड डालें।",
      results: "डाक क्षेत्र {area}xxx में {n} केंद्र, सबसे नज़दीकी पिन पहले",
      none: "डाक क्षेत्र {area}xxx में कोई केंद्र सूचीबद्ध नहीं है।",
      samePin: "वही पिन",
      source:
        "स्रोत: PMBJP केंद्र सूची, {date} (हमारे डेटा में {n} केंद्र)। जाने से पहले आधिकारिक स्टोर लोकेटर देखें।",
      official: "आधिकारिक स्टोर लोकेटर",
      coverageGap:
        "कुछ राज्य और केंद्र शासित प्रदेश (जैसे हरियाणा, पंजाब, असम और अरुणाचल को छोड़कर पूर्वोत्तर) अभी हमारी सूची में नहीं हैं।",
    },
    reviews: {
      heading: "मरीज़ों की समीक्षाएं",
      countLabel: "Google पर {n} समीक्षाएं",
      viewOnGoogle: "Google Maps पर देखें",
      viewReview: "यह समीक्षा Google Maps पर देखें",
      summaryLabel: "इन समीक्षाओं का AI सारांश",
      summaryDisclaimer:
        "नीचे दी गई समीक्षाओं से एक AI मॉडल द्वारा लिखा गया, जो मरीज़ों के अपने शब्द हैं। यह ग़लत हो सकता है — समीक्षाएं पढ़ें।",
      source: "स्रोत: Google समीक्षाएं। शब्द उनके लेखकों के हैं।",
      sourceDated:
        "स्रोत: Google समीक्षाएं, {date} को ली गईं। शब्द उनके लेखकों के हैं।",
    },
    methodology: {
      title: "पद्धति और स्रोत",
      intro:
        "यह साइट कभी भी किसी अस्पताल के लिए एक निश्चित कीमत प्रकाशित नहीं करती। हर संख्या एक सीमा है, जिसके साथ स्रोत और देखे जाने की तारीख अंकित है, ताकि आप तय कर सकें कि इस पर कितना भरोसा करें। अमेरिकी मूल्य पारदर्शिता डेटा के विपरीत, भारतीय अस्पताल मूल्य निर्धारण बीमा योजना या भुगतानकर्ता के अनुसार विभाजित नहीं है — एक प्रक्रिया की एक ही दर होती है, प्रति बीमाकर्ता अलग नहीं, इसलिए हम बस यही दिखाते हैं।",
      dirHeading: "अस्पताल निर्देशिका",
      dirBody:
        "2,684-अस्पताल निर्देशिका (बैंगलोर, दिल्ली, मुंबई, पुणे, चेन्नई, हैदराबाद) Bajaj Allianz की सार्वजनिक नेटवर्क-अस्पताल लोकेटर से ली गई है, जो बेड की संख्या, ICU क्षमता, और नेटवर्क स्थिति के साथ कैशलेस-नेटवर्क अस्पतालों को सूचीबद्ध करती है।",
      govHeading: "सरकारी संदर्भ दरें",
      govBody1:
        "रेट एक्सप्लोरर और हर प्रक्रिया पृष्ठ का “CGHS संदर्भ” आंकड़ा सीधे केंद्रीय सरकार स्वास्थ्य योजना की प्रकाशित दर सूची से आता है — टियर I, जो बैंगलोर का टियर है, NABH प्रत्यायन और वार्ड प्रकार के अनुसार विभाजित। ये सरकार द्वारा भुगतान की जाने वाली प्रतिपूर्ति दरें हैं, जरूरी नहीं कि निजी अस्पताल नकद में जो शुल्क लेता है, लेकिन ये एक आधिकारिक, सुसंगत मानक हैं।",
      govBody2:
        "हम केवल तभी CGHS मिलान दिखाते हैं जब हमें विश्वास हो कि यह वही प्रक्रिया है। एक सामान्य एकल शब्द (जैसे “एंजियोप्लास्टी”) जिसका मतलब कई चिकित्सकीय रूप से भिन्न CGHS लाइन आइटम (कोरोनरी, पेरिफेरल, या रीनल) हो सकता है, उसे अनुमान के बजाय “कोई मिलान नहीं” के रूप में दिखाया जाता है — हम कुछ न दिखाना पसंद करेंगे बजाय भ्रामक कुछ दिखाने के।",
      marketHeading: "बाजार मूल्य अनुमान",
      marketBody1:
        "शहर-स्तरीय सीमाएं, और जहां उपलब्ध हों, अस्पताल-दर-अस्पताल विवरण HexaHealth के प्रकाशित लागत पृष्ठों से आते हैं। ये HexaHealth द्वारा संकलित संपादकीय बाजार अनुमान हैं, पुष्ट बिल की गई राशि नहीं — हर पृष्ठ मूल स्रोत से जुड़ा है।",
      marketBody2:
        "HexaHealth के अस्पताल नाम हमारी अपनी निर्देशिका में किसी विशेष प्रविष्टि से तभी जोड़े जाते हैं जब फ़ॉर्मेटिंग शोर (ब्रांडिंग, विराम चिह्न, शहर का नाम) हटाने के बाद मिलान बिल्कुल सटीक हो। अस्पताल श्रृंखलाओं की अक्सर एक ही शहर में कई शाखाएं होती हैं जिनकी कीमतें बहुत अलग होती हैं, इसलिए एक अस्पष्ट या आंशिक मिलान गलत शाखा को कीमत जोड़ने का जोखिम रखता है — हम इसे बिल्कुल न जोड़ने से भी बदतर मानते हैं, और इसके बजाय अस्पताल का नाम सादे पाठ के रूप में दिखाते हैं।",
      nextHeading: "आगे क्या",
      nextBody:
        "कर्नाटक की KPME रजिस्ट्री सांविधिक, प्रति-प्रतिष्ठान दर फाइलिंग प्रकाशित करती है — भारत में उपलब्ध वास्तविक अस्पताल-विशिष्ट मूल्य निर्धारण के सबसे करीब। हम यह आकलन कर रहे हैं कि क्या पर्याप्त अस्पतालों ने वास्तव में उपयोग करने योग्य दर कार्ड दाखिल किए हैं, इससे पहले कि इसे इस साइट में शामिल किया जाए।",
      medHeading: "दवाओं की कीमतें",
      medBody1:
        "दवाओं को तभी एक समूह में रखा जाता है जब साल्ट, ताकत, रूप (गोली या कैप्सूल) और रिलीज़ का प्रकार सभी बिल्कुल समान हों। धीमी रिलीज़ वाली दवा सामान्य गोली के साथ नहीं रखी जाती, और जो ब्रांड अपनी संरचना का केवल हिस्सा बताता है उसे अनुमान लगाने के बजाय छोड़ दिया जाता है। साल्ट के रूप को मूल दवा तक घटाया जाता है (pantoprazole sodium → pantoprazole), सिवाय जहां साल्ट उत्पाद बदल देता है, जैसे metoprolol succinate बनाम tartrate।",
      medBody2:
        "जन औषधि कीमतें PMBJP उत्पाद सूची से हैं। अधिकतम मूल्य NPPA की अधिसूचित सूची से हैं और GST को छोड़कर हैं। ब्रांड कीमतें A-Z Medicine Dataset of India (Kaggle, CC BY-SA 4.0) की सूचीबद्ध MRP हैं, जो नवंबर 2022 का स्नैपशॉट है। ये उसी तारीख के साथ दिखाई जाती हैं और दुकान की आज की कीमत नहीं हैं। इस साइट का दवा डेटा उसी CC BY-SA 4.0 लाइसेंस के तहत साझा है। साल्ट के नाम NRCeS Common Drug Codes for India (C-DAC, CC BY 4.0) से जांचे जाते हैं।",
      medBody3:
        "जन औषधि केंद्रों के पते PMBJP केंद्र सूची से हैं। हम संचालक का निजी नाम नहीं दिखाते। सूची में नक्शे के निर्देशांक नहीं हैं, इसलिए केंद्र दूरी से नहीं, पिन कोड से खोजे जाते हैं।",
      correctionsHeading: "सुधार",
      correctionsBody:
        "यदि आप यहां सूचीबद्ध किसी अस्पताल को चलाते हैं और मानते हैं कि कुछ गलत या पुराना है, तो हम इसे जल्दी ठीक करना चाहते हैं। योगदान प्रवाह शुरू होने के बाद हर अस्पताल पृष्ठ पर एक सुधार चैनल जोड़ा जाएगा।",
    },
  },
};
