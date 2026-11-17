import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { photo, photoScale } from "./fabric/client";

/* Garment "flats" rendered like photographed flat-lays.

   Each garment is drawn in a 200×240 box in three layers:
   1. cloth   — the silhouette in currentColor (so colourways animate) with a
                woven or knitted grain;
   2. relief  — a height map of folds, creases and seams, lit by a real SVG
                light source (feDiffuseLighting) and blended over the cloth;
   3. trims   — stitching, buttons and edges drawn crisply on top.

   Optional hangers extend the box upwards so garments can hang on a rail.

   These flats are the instant placeholder (and the fallback): <Garment>
   swaps in a photographic render from fabric/photo.ts as soon as a worker
   has made it. Swap in product photography later by replacing <Garment>
   with an <img>. */

export type GarmentKind = "tee" | "overshirt" | "trouser" | "polo";

/** Shared filters. Render once per page. */
export function GarmentDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {/* Colour grain: noise mapped to 0.74–1 and multiplied over the fill. */}
        <filter id="g-weave" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="1.1 0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feColorMatrix in="mono" type="matrix" values="0.28 0 0 0 0.74  0.28 0 0 0 0.74  0.28 0 0 0 0.74  0 0 0 0 1" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" result="woven" />
          <feComposite in="woven" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="g-knit" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.35 2.2" numOctaves="2" seed="9" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feColorMatrix in="mono" type="matrix" values="0.26 0 0 0 0.75  0.26 0 0 0 0.75  0.26 0 0 0 0.75  0 0 0 0 1" result="grain" />
          <feBlend in="SourceGraphic" in2="grain" mode="multiply" result="woven" />
          <feComposite in="woven" in2="SourceGraphic" operator="in" />
        </filter>

        {/* Relief lighting: grey height map → blurred → fabric micro-texture
            added → used as a bump map for a soft key light from the top left. */}
        <filter id="g-relief" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="11" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComposite in="mono" in2="soft" operator="arithmetic" k1="0" k2="0.08" k3="1" k4="-0.04" result="height" />
          <feColorMatrix in="height" type="luminanceToAlpha" result="bump" />
          <feDiffuseLighting in="bump" surfaceScale="4.6" diffuseConstant="1.05" lightingColor="#ffffff" result="lit">
            <feDistantLight azimuth="225" elevation="40" />
          </feDiffuseLighting>
          <feComposite in="lit" in2="SourceAlpha" operator="in" />
        </filter>

        <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="g-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9b98a" />
          <stop offset="0.55" stopColor="#b48a57" />
          <stop offset="1" stopColor="#8a6438" />
        </linearGradient>
        <linearGradient id="g-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8d8f93" />
          <stop offset="0.45" stopColor="#e9eaec" />
          <stop offset="1" stopColor="#77797d" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const isDark = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
};

type Ink = { stitch: string; edge: string; shade: string; light: string };

/** A fold in the height map: ridges are raised (white), valleys sunk (black). */
type Fold = [d: string, width: number, depth: number];

type Shape = {
  body: string;
  knit?: boolean;
  /** Pieces that sit on the cloth and take the lighting (collars, flaps, bands). */
  structure?: (ink: Ink) => ReactNode;
  ridges: Fold[];
  valleys: Fold[];
  /** Crisp details drawn above the lighting (stitching, buttons). */
  trims: (ink: Ink) => ReactNode;
};

const stitch = (k: Ink, d: string, w = 0.7) => (
  <path d={d} fill="none" stroke={k.stitch} strokeWidth={w} strokeDasharray="2 1.6" strokeLinecap="round" />
);

const SHAPES: Record<GarmentKind, Shape> = {
  tee: {
    body: "M76 22 C70 24 52 28 42 31 L12 74 L35 87 L50 72 L50 226 Q100 230 150 226 L150 72 L165 87 L188 74 L158 31 C148 28 130 24 124 22 C116 37 84 37 76 22 Z",
    knit: true,
    structure: (k) => <path d="M79 23 C88 31 112 31 121 23 C114 34 86 34 79 23 Z" fill={k.shade} />,
    ridges: [
      ["M100 44 Q105 92 98 140", 12, 0.55],
      ["M128 96 Q120 134 132 182", 11, 0.6],
      ["M66 146 Q74 180 70 214", 9, 0.5],
      ["M28 62 Q38 68 46 76", 7, 0.45],
      ["M172 62 Q162 68 154 76", 7, 0.45],
    ],
    valleys: [
      ["M70 102 Q82 150 72 204", 7, 0.55],
      ["M116 150 Q110 182 120 216", 6, 0.45],
      ["M52 74 L57 112", 5, 0.5],
      ["M148 74 L143 112", 5, 0.5],
      ["M76 22 C84 37 116 37 124 22", 3, 0.6],
      ["M76 22 L43 31.5 M124 22 L157 31.5", 2, 0.5],
      ["M51 218 Q100 222 149 218", 2.5, 0.45],
    ],
    trims: (k) => (
      <>
        <path d="M76 22 C84 37 116 37 124 22" fill="none" stroke={k.edge} strokeWidth="1" />
        {stitch(k, "M79.5 23.5 C87 34 113 34 120.5 23.5")}
        {stitch(k, "M16 70 L38 82.5 M184 70 L162 82.5")}
        {stitch(k, "M51 219 Q100 223 149 219")}
      </>
    ),
  },
  overshirt: {
    body: "M74 24 L44 34 Q34 38 31 52 L12 176 L36 182 L50 98 L51 222 Q76 234 100 226 Q124 234 149 222 L150 98 L164 182 L188 176 L169 52 Q166 38 156 34 L126 24 Z",
    structure: (k) => (
      <>
        <path d="M74 24 Q100 15 126 24 L121 31 Q100 24 79 31 Z" fill="currentColor" />
        <path d="M74 24 Q100 15 126 24 L121 31 Q100 24 79 31 Z" fill={k.shade} />
        <path d="M74 24 L100 50 L88 60 L66 32 Z M126 24 L100 50 L112 60 L134 32 Z" fill="currentColor" />
        {[62, 114].map((x) => (
          <path key={x} d={`M${x - 1.5} 88 h28 v10 h-28 Z`} fill="currentColor" />
        ))}
      </>
    ),
    ridges: [
      ["M80 70 Q86 120 78 172", 11, 0.5],
      ["M128 112 Q122 162 130 208", 11, 0.55],
      ["M26 70 Q22 120 20 160", 8, 0.45],
      ["M176 70 Q180 120 182 160", 8, 0.45],
      ["M88 52 L74 28 M112 52 L126 28", 4, 0.5],
    ],
    valleys: [
      ["M60 140 Q72 180 64 214", 8, 0.5],
      ["M140 132 Q132 172 142 210", 6, 0.45],
      ["M18 122 Q26 118 34 124 M182 122 Q174 118 166 124", 3, 0.55],
      ["M50 98 L54 132 M150 98 L146 132", 4, 0.5],
      ["M100 50 L100 226 M107 54 L107 228", 1.6, 0.7],
      ["M62 96 h25 v27 l-12.5 4 l-12.5 -4 Z M114 96 h25 v27 l-12.5 4 l-12.5 -4 Z", 1.4, 0.55],
      ["M60.5 98 h28 M112.5 98 h28", 2, 0.6],
      ["M74 24 L100 50 L88 60 L66 32 Z M126 24 L100 50 L112 60 L134 32 Z", 1.4, 0.6],
      ["M74 24 L44.5 34 M126 24 L155.5 34", 1.6, 0.5],
      ["M14.5 164 L38 169.5 M185.5 164 L162 169.5", 1.6, 0.55],
    ],
    trims: (k) => (
      <>
        <path d="M74 24 L100 50 L88 60 L66 32 Z M126 24 L100 50 L112 60 L134 32 Z" fill="none" stroke={k.edge} strokeWidth="0.8" />
        <path d="M100 50 L100 226 M107 54 L107 228" fill="none" stroke={k.edge} strokeWidth="0.6" />
        {stitch(k, "M104.5 56 L104.5 224", 0.6)}
        {[72, 102, 132, 162, 192].map((y) => (
          <g key={y}>
            <circle cx="103.5" cy={y} r="2.7" fill={k.light} stroke={k.edge} strokeWidth="0.6" />
            <circle cx="102.7" cy={y} r="0.45" fill={k.edge} />
            <circle cx="104.3" cy={y} r="0.45" fill={k.edge} />
          </g>
        ))}
        {[62, 114].map((x) => (
          <g key={x}>
            <path d={`M${x} 96 h25 v27 l-12.5 4 l-12.5 -4 Z`} fill="none" stroke={k.edge} strokeWidth="0.6" />
            {stitch(k, `M${x + 2} 99 h21 v22 l-10.5 3.4 l-10.5 -3.4 Z`, 0.55)}
            <path d={`M${x - 1.5} 88 h28 v10 h-28 Z`} fill="none" stroke={k.edge} strokeWidth="0.6" />
            <circle cx={x + 12.5} cy="94" r="1.9" fill={k.light} stroke={k.edge} strokeWidth="0.5" />
          </g>
        ))}
        <path d="M14.5 164 L38 169.5 M185.5 164 L162 169.5" fill="none" stroke={k.edge} strokeWidth="0.6" />
        {stitch(k, "M52 216 Q76 228 100 220 Q124 228 148 216", 0.6)}
      </>
    ),
  },
  trouser: {
    body: "M53 30 L44 228 L94 228 L100 96 L106 228 L156 228 L147 30 Z",
    structure: (k) => (
      <>
        <path d="M54 15 L146 15 L147 30 L53 30 Z" fill="currentColor" />
        <path d="M54 15 L146 15 L147 30 L53 30 Z" fill={k.shade} opacity="0.3" />
        {[62, 84, 116, 138].map((x) => (
          <rect key={x} x={x} y="13" width="4.5" height="19" rx="1" fill="currentColor" />
        ))}
      </>
    ),
    ridges: [
      ["M71 66 L67 222", 4, 0.6],
      ["M129 66 L133 222", 4, 0.6],
      ["M84 100 Q87 140 82 182", 9, 0.45],
      ["M118 104 Q114 146 120 186", 8, 0.4],
    ],
    valleys: [
      ["M90 120 Q86 170 90 222", 6, 0.55],
      ["M110 120 Q114 170 110 222", 6, 0.55],
      ["M78 30 L80.5 62 M122 30 L119.5 62", 2.2, 0.6],
      ["M58 30 Q65 52 71 64 M142 30 Q135 52 129 64", 1.8, 0.6],
      ["M100 30 L100 92", 1.8, 0.6],
      ["M58 150 Q70 146 82 152 M118 152 Q130 146 142 150", 3, 0.4],
      ["M53 30 L147 30", 2.2, 0.55],
    ],
    trims: (k) => (
      <>
        <path d="M54 15 L146 15 L147 30 L53 30 Z" fill="none" stroke={k.edge} strokeWidth="0.8" />
        {stitch(k, "M55 18.5 L145 18.5 M54 27 L146 27", 0.6)}
        {[62, 84, 116, 138].map((x) => (
          <rect key={x} x={x} y="13" width="4.5" height="19" rx="1" fill="none" stroke={k.edge} strokeWidth="0.6" />
        ))}
        <circle cx="100" cy="22.5" r="2.6" fill={k.light} stroke={k.edge} strokeWidth="0.6" />
        {stitch(k, "M107 31 L107 78 Q107 89 100 92")}
        <path d="M58 30 Q65 52 71 64 M142 30 Q135 52 129 64" fill="none" stroke={k.edge} strokeWidth="0.7" />
        {stitch(k, "M45 221 L93.5 221 M106.5 221 L155 221", 0.6)}
      </>
    ),
  },
  polo: {
    body: "M76 22 C70 24 52 28 42 31 L14 72 L36 84 L50 72 L50 222 Q100 226 150 222 L150 72 L164 84 L186 72 L158 31 C148 28 130 24 124 22 Z",
    knit: true,
    structure: (k) => (
      <>
        <path d="M95 40 h10 v50 h-10 Z" fill="currentColor" />
        <path d="M95 40 h10 v50 h-10 Z" fill={k.shade} opacity="0.2" />
        <path d="M76 20 Q100 13 124 20 L118 26 Q100 21 82 26 Z" fill="currentColor" />
        <path d="M76 20 Q100 13 124 20 L118 26 Q100 21 82 26 Z" fill={k.shade} />
        <path d="M76 20 L62 36 L92 56 L100 40 Z M124 20 L138 36 L108 56 L100 40 Z" fill="currentColor" />
      </>
    ),
    ridges: [
      ["M128 100 Q122 140 132 192", 10, 0.55],
      ["M74 64 Q80 90 76 116", 8, 0.4],
      ["M30 60 Q40 66 46 74 M170 60 Q160 66 154 74", 6, 0.45],
      ["M78 30 L90 50 M122 30 L110 50", 4, 0.5],
    ],
    valleys: [
      ["M70 112 Q80 160 72 206", 7, 0.55],
      ["M52 74 L57 112 M148 74 L143 112", 5, 0.5],
      ["M95 40 L95 90 M105 40 L105 90", 1.6, 0.6],
      ["M76 20 L62 36 L92 56 L100 40 Z M124 20 L138 36 L108 56 L100 40 Z", 1.4, 0.6],
      ["M51 210 Q100 214 149 210", 2.2, 0.55],
      ["M17.5 67.5 L38.5 79 M182.5 67.5 L161.5 79", 2, 0.5],
    ],
    trims: (k) => (
      <>
        <path d="M95 40 h10 v50 h-10 Z" fill="none" stroke={k.edge} strokeWidth="0.6" />
        {[56, 70, 84].map((y) => (
          <circle key={y} cx="100" cy={y} r="2.3" fill={k.light} stroke={k.edge} strokeWidth="0.5" />
        ))}
        <path d="M76 20 L62 36 L92 56 L100 40 Z M124 20 L138 36 L108 56 L100 40 Z" fill="none" stroke={k.edge} strokeWidth="0.8" />
        {stitch(k, "M65.5 36 L91 53 M134.5 36 L109 53", 0.55)}
        <path d="M17.5 67.5 L38.5 79 M182.5 67.5 L161.5 79 M51 210 Q100 214 149 210" fill="none" stroke={k.edge} strokeWidth="0.6" />
        <g fill="none" stroke={k.stitch} strokeWidth="0.45">
          {[60, 72, 84, 96, 108, 120, 132, 144].map((x) => (
            <path key={x} d={`M${x} 211.5 L${x} 223`} />
          ))}
        </g>
      </>
    ),
  },
};

/** Hook and bar, drawn in the garment's coordinates above its shoulders. */
function Hanger({ bottom }: { bottom: boolean }) {
  const hook = (
    <path
      d="M100 14 L100 -6 Q100 -14 106 -18 Q116 -25 111 -35 Q105 -44 96 -38"
      fill="none"
      stroke="url(#g-metal)"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  );
  if (bottom) {
    return (
      <g aria-hidden="true">
        {hook}
        <rect x="48" y="2" width="104" height="5" rx="2.5" fill="url(#g-metal)" />
        {[58, 136].map((x) => (
          <rect key={x} x={x} y="5" width="7" height="16" rx="1.5" fill="#3d3e41" />
        ))}
      </g>
    );
  }
  return (
    <g aria-hidden="true">
      {hook}
      <path d="M36 38 Q100 8 164 38" fill="none" stroke="url(#g-wood)" strokeWidth="7" strokeLinecap="round" />
    </g>
  );
}

function GarmentFlat({
  kind,
  color,
  title,
  className,
  hanger = false,
}: {
  kind: GarmentKind;
  color: string;
  title?: string;
  className?: string;
  /** Draw it on a hanger (extends the drawing upwards to fit the hook). */
  hanger?: boolean;
}) {
  const clipId = `gc-${useId().replace(/[^\w-]/g, "")}`;
  const dark = isDark(color);
  const ink: Ink = dark
    ? { stitch: "rgba(255,255,255,0.28)", edge: "rgba(0,0,0,0.42)", shade: "rgba(0,0,0,0.28)", light: "rgba(255,255,255,0.14)" }
    : { stitch: "rgba(45,32,20,0.34)", edge: "rgba(45,32,20,0.24)", shade: "rgba(45,32,20,0.14)", light: "rgba(255,255,255,0.6)" };
  const shape = SHAPES[kind];
  const viewBox = hanger ? "0 -46 200 286" : "0 0 200 240";

  return (
    <svg
      viewBox={viewBox}
      className={className ?? "garment"}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ color }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={shape.body} />
        </clipPath>
      </defs>
      {hanger && kind !== "trouser" && <Hanger bottom={false} />}

      <path d={shape.body} fill="currentColor" filter={shape.knit ? "url(#g-knit)" : "url(#g-weave)"} />
      {shape.structure?.(ink)}

      <g className="garment__relief" clipPath={`url(#${clipId})`}>
        <g filter="url(#g-relief)">
          <path d={shape.body} fill="#808080" />
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {shape.ridges.map(([d, w, depth], i) => (
              <path key={`r${i}`} d={d} stroke="#ffffff" strokeWidth={w} strokeOpacity={depth} />
            ))}
            {shape.valleys.map(([d, w, depth], i) => (
              <path key={`v${i}`} d={d} stroke="#000000" strokeWidth={w} strokeOpacity={depth} />
            ))}
          </g>
        </g>
      </g>

      <path d={shape.body} fill="url(#g-sheen)" />
      {shape.trims(ink)}
      <path d={shape.body} fill="none" stroke={ink.edge} strokeWidth="0.8" />

      {hanger && kind === "trouser" && <Hanger bottom />}
    </svg>
  );
}

/**
 * A garment as a photographic flat-lay (or hanging on the rail). Shows the
 * drawn flat until the render is ready, then fades the photo in.
 * `prefetch` warms other colourways so switching is instant.
 */
export function Garment({
  kind,
  color,
  title,
  className,
  hanger = false,
  prefetch,
}: {
  kind: GarmentKind;
  color: string;
  title?: string;
  className?: string;
  hanger?: boolean;
  prefetch?: string[];
}) {
  const wrap = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flat, setFlat] = useState(true);
  const warm = prefetch?.join();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let live = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const scale = photoScale(el.offsetWidth);
        photo(kind, color, hanger, scale).then((url) => {
          if (!live || !url) return;
          setSrc(url);
          warm?.split(",").forEach((hex) => hex !== color && photo(kind, hex, hanger, scale));
        });
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => {
      live = false;
      io.disconnect();
    };
  }, [kind, color, hanger, warm]);

  // once the photo has faded in, drop the drawn flat (its lighting filters are costly to keep)
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setFlat(false), 650);
    return () => window.clearTimeout(t);
  }, [ready]);

  return (
    <span
      ref={wrap}
      className={`garment garment--photo${className ? ` ${className}` : ""}${ready ? " is-ready" : ""}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ aspectRatio: hanger ? "200 / 286" : "200 / 240" }}
    >
      {flat && <GarmentFlat kind={kind} color={color} hanger={hanger} className="garment__flat" />}
      {src && <img className="garment__photo" src={src} alt="" decoding="async" draggable={false} onLoad={() => setReady(true)} />}
    </span>
  );
}
