// Decorative line illustrations drawn in code (no image files, no licence questions).
export function HeroArt({ kind }: { kind: "search" | "outlook" }) {
  const common = { viewBox: "0 0 240 120", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false };
  return (
    <div style={{ color: "var(--link)", margin: "18px 0 6px", maxWidth: 280, opacity: 0.9 }}>
      {kind === "search" ? (
        <svg {...common}>
          <rect x="18" y="18" width="62" height="82" rx="6" />
          <path d="M30 36h38M30 48h38M30 60h22" />
          <rect x="70" y="30" width="62" height="82" rx="6" opacity="0.6" />
          <circle cx="170" cy="56" r="30" />
          <path d="M192 78l30 30" strokeWidth="4" />
          <circle cx="160" cy="48" r="3" /><circle cx="180" cy="50" r="3" /><circle cx="170" cy="66" r="3" />
          <path d="M160 48l20 2M180 50l-10 16M160 48l10 18" opacity="0.7" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M16 100h208M16 100V16" />
          <path d="M28 82l34-26 30 18 36-40 38 14 40-28" />
          <path d="M28 82l34-26 30 18 36-40" strokeDasharray="1 6" opacity="0.5" />
          <circle cx="62" cy="56" r="4" /><circle cx="92" cy="74" r="4" /><circle cx="128" cy="34" r="4" /><circle cx="166" cy="48" r="4" /><circle cx="206" cy="20" r="4" />
        </svg>
      )}
    </div>
  );
}
