"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

// Inlined by app/layout.tsx next to NO_FLASH_THEME_SCRIPT, before hydration.
// A returning Hindi reader gets lang="hi" at once (so the Devanagari font
// stack and Hindi type metrics apply), and data-locale-pending hides the
// chrome and <main> until the first Hindi render commits. globals.css
// reveals them after 600ms regardless, so content is never hidden longer.
// Keep the storage key in sync with STORAGE_KEY above.
export const NO_FLASH_LOCALE_SCRIPT = `(function(){try{if(localStorage.getItem('${STORAGE_KEY}')==='hi'){var d=document.documentElement;d.lang='hi';d.setAttribute('data-locale-pending','')}}catch(e){}})();`;

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
  // `ready` flips once the saved locale has been read after mount. Until then
  // the server-rendered English stays up and data-locale-pending (if set) is
  // left alone, so a returning Hindi reader never sees English revealed.
  const [state, setState] = useState<{ locale: Locale; ready: boolean }>({ locale: "en", ready: false });
  const { locale, ready } = state;

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore: localStorage unavailable
    }
    // Hydrates client-only persisted state after mount; the extra render
    // is the standard, deliberate trade-off for avoiding a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ locale: saved === "hi" ? "hi" : "en", ready: true });
  }, []);

  // Runs after the first render in the saved locale has committed: set lang
  // on <html> (Devanagari font + Hindi metrics in globals.css) and reveal.
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.lang = locale;
    root.removeAttribute("data-locale-pending");
  }, [locale, ready]);

  const setLocale = useCallback((l: Locale) => {
    setState({ locale: l, ready: true });
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

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
  }, [locale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}
