import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider, NO_FLASH_THEME_SCRIPT } from "@/lib/theme/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedCost India — hospital directory & price transparency",
  description:
    "Compare hospital procedure prices and network hospitals across India, with a source-cited government reference rate on every page.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} flex min-h-screen flex-col bg-background font-sans text-ink-900 antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
        <ThemeProvider>
          <LanguageProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
