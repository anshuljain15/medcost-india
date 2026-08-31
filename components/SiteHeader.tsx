"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";

export default function SiteHeader() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/procedures", label: t("nav.procedures") },
    { href: "/hospitals", label: t("nav.hospitals") },
    { href: "/rates", label: t("nav.rates") },
    { href: "/methodology", label: t("nav.methodology") },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-ink-100 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
          MedCost India
        </Link>

        <nav className="hidden gap-8 text-sm font-medium text-ink-700 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand-700">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <Link
            href="/procedures"
            className="hidden rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:inline-block"
          >
            {t("nav.findPrice")}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-300 text-ink-700 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ink-100 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-ink-700">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="hover:text-brand-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-3 sm:hidden">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
