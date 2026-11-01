"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AnnounceContext = createContext<(msg: string) => void>(() => {});

/**
 * One polite live region for the whole app (mounted in the root layout).
 * `useAnnounce()` posts search counts, OCR progress and "results appeared"
 * messages to it. The region is cleared first, so repeating the same message
 * is still announced.
 */
export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback((msg: string) => {
    setMessage("");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(msg), 100);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

/** Returns announce(msg). Outside a LiveRegionProvider it is a no-op. */
export function useAnnounce(): (msg: string) => void {
  return useContext(AnnounceContext);
}
