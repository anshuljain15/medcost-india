import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { ThemeProvider, NO_FLASH_THEME_SCRIPT } from "@/lib/theme/ThemeProvider";
import { LanguageProvider, NO_FLASH_LOCALE_SCRIPT } from "@/lib/i18n/LanguageProvider";
import { getMedicinesMeta } from "@/lib/medicines";
import { LiveRegionProvider } from "@/components/ui/LiveRegion";
import SkipLink from "@/components/chrome/SkipLink";
import SiteHeader from "@/components/chrome/SiteHeader";
import SiteFooter from "@/components/chrome/SiteFooter";
import TabBar from "@/components/chrome/TabBar";

// latin-ext carries the rupee sign (U+20B9).
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
// Joins the font stack only under html:lang(hi) (globals.css), and is not
// preloaded, so an English page view never downloads it.
const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  variable: "--font-deva",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: { template: "%s · MedCost India", default: "MedCost India — was your hospital bill fair?" },
  description:
    "Check hospital quotes, hospital bills and medicine bills against public prices. Every price is a range with its source and date.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables sit on <html> so --font-stack resolves at :root.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${deva.variable}`}>
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-label antialiased">
        {/* Two tags, never `A + B`: both constants live in "use client"
            modules, so in this server component they are client-reference
            proxies. Passed through untouched, SSR resolves each to its real
            string; concatenated here, they would stringify to the proxies'
            function source and neither script would run. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_LOCALE_SCRIPT }} />
        <ThemeProvider>
          <LanguageProvider>
            <LiveRegionProvider>
              <SkipLink />
              {/* Server-side read; only the date string reaches the browser
                  (for the search sheet's Jan Aushadhi footnote). */}
              <SiteHeader medicinesDate={getMedicinesMeta().janAushadhi.snapshotDate} />
              <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
                {children}
              </main>
              <SiteFooter />
              <TabBar />
            </LiveRegionProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
