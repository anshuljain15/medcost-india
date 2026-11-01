"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";

/** What the person picked: follow the device ("system", the default) or a fixed theme. */
export type Mode = "system" | "light" | "dark";
/** What is on screen: data-theme on <html>. */
export type Theme = "light" | "dark";

type ThemeContextValue = {
  mode: Mode;
  theme: Theme;
  setMode: (mode: Mode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "medcost-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// Keep this in sync with the inline script in app/layout.tsx, which sets
// data-theme before hydration so there's no flash of the wrong theme.
// Resolution order: a saved "light"/"dark" first, otherwise the system setting.
// Only an explicit Light/Dark choice is saved; "system" removes the key.
export const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('${STORAGE_KEY}');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

function subscribeToSystem(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches;
const serverPrefersDark = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // null until the saved choice is read after mount. Until then the no-flash
  // script owns data-theme, so nothing below writes it.
  const [savedMode, setSavedMode] = useState<Mode | null>(null);
  // Live OS preference: re-renders when the device switches light/dark.
  const systemDark = useSyncExternalStore(subscribeToSystem, systemPrefersDark, serverPrefersDark);

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
    setSavedMode(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  const mode: Mode = savedMode ?? "system";
  const theme: Theme = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    if (savedMode === null) return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [savedMode, theme]);

  const setMode = useCallback((next: Mode) => {
    setSavedMode(next);
    try {
      if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({ mode, theme, setMode }), [mode, theme, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
