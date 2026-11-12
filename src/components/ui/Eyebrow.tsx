import type { ReactNode } from "react";

/** Mono section label, e.g. "(02) Selected work". */
export function Eyebrow({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <p className="eyebrow">
      {index && <span className="eyebrow__index">({index})</span>}
      <span>{children}</span>
    </p>
  );
}
