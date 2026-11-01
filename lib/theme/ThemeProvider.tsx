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
// Marks a saved theme as a real choice. The pre-redesign provider saved the
// theme on every first visit (light, then whatever the OS was), so a bare
// saved value without this marker is not a choice: it is dropped once and
// those visitors get the new Auto default. setMode writes the marker.
const VERSION_KEY = "medcost-theme-v";
const VERSION = "2";
const DARK_QUERY = "(prefers-color-scheme: dark)";
// Our own theme-color meta (see NO_FLASH_THEME_SCRIPT).
const THEME_COLOR_ID = "mc-theme-color";

// Keep this in sync with the inline script in app/layout.tsx, which sets
// data-theme before hydration so there's no flash of the wrong theme.
// Resolution order: a saved "light"/"dark" first (only with the version
// marker), otherwise the system setting. Only an explicit Light/Dark choice is
// saved; "system" removes the key. It also gives the browser bar the shown
// theme's canvas through its own theme-color meta (#mc-theme-color), put
// first in <head> so it wins over the OS-keyed pair from app/layout.tsx.
// React never renders it, so hydration never sees it change.
export const NO_FLASH_THEME_SCRIPT = `
(function () {
  var d = document.documentElement, saved = null;
  try {
    if (localStorage.getItem('${VERSION_KEY}') !== '${VERSION}') localStorage.removeItem('${STORAGE_KEY}');
    saved = localStorage.getItem('${STORAGE_KEY}');
  } catch (e) {}
  try {
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    d.setAttribute('data-theme', theme);
    var c = getComputedStyle(d).getPropertyValue('--canvas').trim();
    if (c) {
      var m = document.getElementById('${THEME_COLOR_ID}');
      if (!m) { m = document.createElement('meta'); m.id = '${THEME_COLOR_ID}'; m.name = 'theme-color'; document.head.prepend(m); }
      m.content = c;
    }
  } catch (e) {}
})();
`;

/** Give the browser bar the shown theme's --canvas (read from the token, no hex here). */
function syncThemeColor() {
  const canvas = getComputedStyle(document.documentElement).getPropertyValue("--canvas").trim();
  if (!canvas) return;
  let meta = document.getElementById(THEME_COLOR_ID) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.id = THEME_COLOR_ID;
    meta.name = "theme-color";
    document.head.prepend(meta);
  }
  meta.content = canvas;
}

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
      // Same one-time migration as NO_FLASH_THEME_SCRIPT.
      if (window.localStorage.getItem(VERSION_KEY) !== VERSION) window.localStorage.removeItem(STORAGE_KEY);
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
    syncThemeColor();
  }, [savedMode, theme]);

  const setMode = useCallback((next: Mode) => {
    setSavedMode(next);
    try {
      window.localStorage.setItem(VERSION_KEY, VERSION);
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
