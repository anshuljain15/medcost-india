"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations, type Locale } from "./translations";

type Dict = (typeof translations)["en"];

type LanguageContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dict: Dict;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "medcost-locale";

function resolve(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      // Hydrates client-only persisted state after mount; the extra render
      // is the standard, deliberate trade-off for avoiding a mismatch.
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "hi") setLocaleState(saved);
    } catch {
      // ignore — localStorage unavailable
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const value = useMemo<LanguageContextValue>(() => {
    const dict = translations[locale];
    return {
      locale,
      setLocale,
      dict,
      t: (path, vars) => {
        const raw = resolve(dict, path);
        return typeof raw === "string" ? interpolate(raw, vars) : path;
      },
    };
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
