import { useId } from "react";

/**
 * The Auvier mark: an "A" whose crossbar is a single dot. Each company in the
 * group gives the dot its own meaning:
 *  - "solid"  — Auvier Groups: a brass seal
 *  - "live"   — Auvier Technologies: the moment a site goes live (it breathes)
 *  - "button" — Auvier Clothing: a two-hole button
 */
export type MarkDot = "solid" | "live" | "button";

export function Mark({ size = 28, dot = "live" }: { size?: number; dot?: MarkDot }) {
  const maskId = `btn-${useId().replace(/[^\w-]/g, "")}`;
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M14 51 L32 12 L50 51"
        fill="none"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot === "button" ? (
        <>
          <mask id={maskId}>
            <rect width="64" height="64" fill="#fff" />
            <circle cx="30" cy="38.5" r="1.25" fill="#000" />
            <circle cx="34" cy="38.5" r="1.25" fill="#000" />
          </mask>
          <circle className="mark__dot" cx="32" cy="38.5" r="5.8" mask={`url(#${maskId})`} />
        </>
      ) : (
        <circle className={dot === "live" ? "mark__dot is-live" : "mark__dot"} cx="32" cy="38.5" r="5.25" />
      )}
    </svg>
  );
}

export function Logo({ sub, dot = "live" }: { sub: string; dot?: MarkDot }) {
  return (
    <span className="logo">
      <Mark dot={dot} />
      <span className="logo__word">Auvier</span>
      <span className="logo__sub">{sub}</span>
    </span>
  );
}
