// Small helpers the list screens share.

import { useEffect, useState, type ReactNode } from "react";

/** True while the window matches a CSS media query. */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatches(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export const WIDE = "(min-width: 1101px)";

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="d-page-h">
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="d-search">
      <svg className="d-i" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ border: 0, background: "transparent", minHeight: 40, padding: 0 }}
      />
    </label>
  );
}
