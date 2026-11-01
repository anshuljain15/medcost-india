// The "Tools and pages" group of universal search: the 10 non-dynamic routes,
// each with a translated title and en + hi keywords (search-only, never shown).
// Tools come first because the empty search state offers the first 4.
// Keywords are lowercase; matching normalises with toLowerCase().normalize("NFC").

export type SearchRoute = { href: string; titleKey: string; keywords: string[] };

export const SEARCH_ROUTES: SearchRoute[] = [
  {
    href: "/check-quote",
    titleKey: "nav.checkQuote",
    keywords: [
      "check quote", "hospital quote", "estimate", "hospital bill", "final bill", "is my bill fair", "overcharged",
      "कोटेशन", "अस्पताल का बिल", "बिल जाँचें", "खर्च", "अनुमान",
    ],
  },
  {
    href: "/check-bill",
    titleKey: "nav.checkBill",
    keywords: [
      "medicine bill", "pharmacy bill", "chemist bill", "check bill", "mrp", "nppa", "ceiling price",
      "दवा का बिल", "दवाई का बिल", "केमिस्ट", "बिल जाँचें",
    ],
  },
  {
    href: "/medicines",
    titleKey: "nav.findMedicine",
    keywords: [
      "medicine", "medicines", "cheaper medicine", "generic", "brand", "tablet", "capsule", "jan aushadhi price",
      "दवा", "दवाई", "दवाइयाँ", "सस्ती दवा", "जेनेरिक",
    ],
  },
  {
    href: "/kendras",
    titleKey: "nav.kendras",
    keywords: [
      "jan aushadhi", "kendra", "store", "pharmacy", "generic medicine shop", "pmbjp", "pin code",
      "जन औषधि", "केंद्र", "दवा की दुकान", "पिन कोड",
    ],
  },
  {
    href: "/procedures",
    titleKey: "nav.procedures",
    keywords: [
      "treatment", "treatment cost", "surgery", "operation", "procedure", "price", "cost", "bangalore",
      "इलाज", "इलाज का खर्च", "ऑपरेशन", "सर्जरी", "कीमत", "बैंगलोर",
    ],
  },
  {
    href: "/rates",
    titleKey: "nav.rates",
    keywords: [
      "cghs", "government rate", "govt rate", "cghs rate", "package rate", "ward",
      "सरकारी दर", "सरकारी रेट", "सीजीएचएस",
    ],
  },
  {
    href: "/hospitals",
    titleKey: "nav.findHospital",
    keywords: [
      "hospital", "hospitals", "network hospital", "cashless", "nabh", "delhi", "mumbai", "chennai", "hyderabad", "pune",
      "अस्पताल", "हॉस्पिटल", "दिल्ली", "मुंबई", "चेन्नई", "हैदराबाद", "पुणे",
    ],
  },
  {
    href: "/share-bill",
    titleKey: "nav.shareBill",
    keywords: [
      "share bill", "report bill", "what i paid", "patient bills", "anonymous",
      "बिल साझा", "बिल बताएँ", "मैंने कितना दिया",
    ],
  },
  {
    href: "/methodology",
    titleKey: "nav.methodology",
    keywords: [
      "methodology", "how we get prices", "sources", "about", "data", "report a mistake", "wrong price", "correction",
      "स्रोत", "हम कीमतें कहाँ से लेते हैं", "ग़लत कीमत", "गलत कीमत",
    ],
  },
  {
    href: "/",
    titleKey: "nav.home",
    keywords: ["home", "start", "medcost", "होम", "शुरुआत"],
  },
];
