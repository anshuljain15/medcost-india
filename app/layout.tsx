import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedCost India — hospital directory & price transparency",
  description:
    "Compare hospital procedure prices and network hospitals across India, with a source-cited government reference rate on every page.",
};

const NAV_LINKS = [
  { href: "/procedures", label: "Procedures" },
  { href: "/hospitals", label: "Hospitals" },
  { href: "/rates", label: "Rate Explorer" },
  { href: "/methodology", label: "Methodology" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} flex min-h-screen flex-col bg-white font-sans text-ink-900 antialiased`}>
        <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
              MedCost India
            </Link>
            <nav className="hidden gap-8 text-sm font-medium text-ink-700 sm:flex">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-brand-700">
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/procedures"
              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Find a price
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-ink-100 bg-ink-50">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-500">
            <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-ink-900">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
                  MedCost India
                </div>
                <p className="mt-2 max-w-xs">
                  Every price on this site is a range with a visible source and date —
                  never a single made-up number.
                </p>
              </div>
              <div className="flex gap-12">
                <div>
                  <div className="font-semibold text-ink-900">Explore</div>
                  <ul className="mt-2 space-y-1">
                    <li><Link href="/procedures" className="hover:text-brand-700">Procedures</Link></li>
                    <li><Link href="/hospitals" className="hover:text-brand-700">Hospitals</Link></li>
                    <li><Link href="/rates" className="hover:text-brand-700">Rate Explorer</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-ink-900">About</div>
                  <ul className="mt-2 space-y-1">
                    <li><Link href="/methodology" className="hover:text-brand-700">Methodology</Link></li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-8 border-t border-ink-100 pt-6 text-xs">
              Hospital directory adapted from Bajaj Allianz&apos;s public network-hospital
              locator. Procedure prices from HexaHealth (market estimates) and CGHS
              (government reference rates). Map data © OpenStreetMap contributors.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
