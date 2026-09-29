import { useId } from "react";

/** The CoHost AI mark: an open C around Brio's spectrum dot. Same drawing as the favicon. */
export function LogoMark({ className }: { className?: string }) {
  // Only characters that are safe inside url(#…).
  const id = `logo${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb547" />
          <stop offset=".35" stopColor="#ff6a55" />
          <stop offset=".6" stopColor="#ff4f9a" />
          <stop offset=".8" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0e1119" />
      <rect
        x=".5"
        y=".5"
        width="31"
        height="31"
        rx="8.5"
        fill="none"
        stroke="rgba(255,255,255,.14)"
      />
      <path
        d="M21.9 10.3A8.2 8.2 0 1 0 21.9 21.7"
        fill="none"
        stroke="#f4f5f8"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle
        className="logo-dot"
        cx="24.4"
        cy="16"
        r="3.1"
        fill={`url(#${id}s)`}
      />
    </svg>
  );
}

/** The mark, the name and "Powered by Brio", linking back to the top. */
export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <a
      className="brand"
      href="#top"
      aria-label="CoHost AI, powered by Brio. Back to top"
      onClick={onClick}
    >
      <LogoMark className="brand-mark" />
      <span className="brand-name">CoHost AI</span>
      <span className="brand-badge">
        Powered by<b>Brio</b>
      </span>
    </a>
  );
}
