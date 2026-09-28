"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "wwc.theme";

/**
 * Light/dark switch.
 *
 * The class is applied by an inline script in the document head before paint
 * (see `ThemeScript`), so this component only has to keep the toggle in sync
 * with whatever that script already decided.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* the preference just will not persist */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        className ??
        "inline-flex size-10 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:surface-sunken hover:text-[var(--text-primary)]"
      }
    >
      {/* Rendering nothing until mounted avoids a hydration mismatch when the
          stored preference differs from the server's assumption. */}
      {!ready ? null : dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/**
 * Runs before the first paint so a dark-mode visitor never sees a white flash.
 * Has to be a raw string: a React component would run too late.
 */
export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&m)){document.documentElement.classList.add('dark')}}catch(e){}})()`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
