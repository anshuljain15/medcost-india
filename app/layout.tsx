import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedCost India — hospital directory & price transparency",
  description:
    "A directory of Indian network hospitals with a transparent, source-cited procedure-pricing layer, starting with Bangalore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
              MedCost India
            </Link>
            <nav className="flex gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/hospitals" className="hover:text-blue-600">
                Hospitals
              </Link>
              <Link href="/methodology" className="hover:text-blue-600">
                Methodology
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Hospital directory data adapted from Bajaj Allianz&apos;s public network-hospital locator.
          Map data © OpenStreetMap contributors.
        </footer>
      </body>
    </html>
  );
}
