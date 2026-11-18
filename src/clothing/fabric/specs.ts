import { line, offset, polyLength, quad, trim, type P } from "./field";

/* What each garment is made of, for the photographic renderer (photo.ts).
   Coordinates are the same 200×240 box as the SVG flats in Garments.tsx:
   the tee body is 100 units wide (about 52 cm), so 1 unit ≈ 5 mm.
   Heights are in the same units (one ply of fabric ≈ 0.3). */

export type Kind = "tee" | "overshirt" | "trouser" | "polo";
export type Button = { x: number; y: number; r: number; holes: 2 | 4 };

export type Spec = {
  body: string;
  /** More silhouette: the inside back of a collar, a waistband, belt loops. */
  extra: string[];
  /** Raised pieces sewn on top: [path, height]. */
  layers: [string, number][];
  /** Where you see the inside of the garment (darker, lower). */
  inside: string[];
  /** Soft folds: [path, width, depth]; negative depth is a valley. */
  folds: [string, number, number][];
  /** Sharp pressed creases: [path, depth]. */
  creases: [string, number][];
  /** Seam lines (small grooves). */
  seams: string[];
  /** Topstitching rows. */
  stitches: string[];
  /** Rib knit lines (collars, neckbands, cuffs). */
  ribs: string[];
  buttons: Button[];
  buttonTone: "horn" | "tonal";
  label?: [number, number, number, number];
  mark?: [number, number, number];
  knit: boolean;
};

/* --- path helpers -------------------------------------------------------- */

const path = (pts: P[], close = false) =>
  pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") + (close ? " Z" : "");

function cubic(a: P, b: P, c: P, d: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return out;
}

/** Band between a curve and its offset, as a closed path. */
const band = (pts: P[], d: number) => path([...pts, ...offset(pts, d).reverse()], true);

/** Rib lines across a band, every `pitch` units along the curve. */
function ribsAlong(pts: P[], d: number, pitch: number) {
  const len = polyLength(pts);
  const inner = offset(pts, d);
  const out: string[] = [];
  for (let s = pitch / 2; s < len; s += pitch) {
    const i = Math.min(pts.length - 1, Math.round((s / len) * (pts.length - 1)));
    out.push(path([pts[i], inner[i]]));
  }
  return out;
}

/** Rib lines across a quad from edge ab to edge dc. */
function ribsAcross(a: P, b: P, c: P, d: P, pitch: number) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const out: string[] = [];
  for (let s = pitch / 2; s < len; s += pitch) {
    const t = s / len;
    out.push(
      path([
        [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        [d[0] + (c[0] - d[0]) * t, d[1] + (c[1] - d[1]) * t],
      ]),
    );
  }
  return out;
}

/** A polygon shrunk inwards by d along each edge (convex shapes). */
function inset(pts: P[], d: number): P[] {
  const n = pts.length;
  // signed area tells us which side is inside
  let area = 0;
  for (let i = 0; i < n; i++) area += pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1];
  const s = area > 0 ? 1 : -1;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const tx = q[0] - p[0];
    const ty = q[1] - p[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = (-ty / len) * s * d;
    const ny = (tx / len) * s * d;
    return [p[0] + nx, p[1] + ny, tx, ty] as const;
  });
  return lines.map((l, i) => {
    const m = lines[(i - 1 + n) % n];
    const den = m[2] * l[3] - m[3] * l[2];
    if (Math.abs(den) < 1e-9) return [l[0], l[1]] as P;
    const t = ((l[0] - m[0]) * l[3] - (l[1] - m[1]) * l[2]) / den;
    return [m[0] + m[2] * t, m[1] + m[3] * t] as P;
  });
}

const mirror = (pts: P[]): P[] => pts.map(([x, y]) => [200 - x, y] as P);
const trimmed = (pts: P[], a: number, b = a) => trim(pts, a, polyLength(pts) - b);
const rect = (x: number, y: number, w: number, h: number): P[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/* --- tee ----------------------------------------------------------------- */

const tee: Spec = (() => {
  const scoop = cubic([124, 22], [116, 37], [84, 37], [76, 22], 40); // right → left
  const backNeck = quad([76, 22], [100, 27.5], [124, 22], 24);
  const hem = quad([50, 226], [100, 230], [150, 226], 30);
  const cuffL = line([12, 74], [35, 87], 10);
  const cuffR = line([188, 74], [165, 87], 10);
  return {
    body: "M76 22 C70 24 52 28 42 31 L12 74 L35 87 L50 72 L50 226 Q100 230 150 226 L150 72 L165 87 L188 74 L158 31 C148 28 130 24 124 22 C116 37 84 37 76 22 Z",
    extra: [path([...backNeck, ...scoop], true)],
    inside: [path([...backNeck, ...scoop], true)],
    layers: [
      [band(scoop, -3.6), 0.42],
      [band(backNeck, 2.6), 0.3],
      [band(hem, -4), 0.24],
      [band(cuffL, -3.4), 0.24],
      [band(cuffR, 3.4), 0.24],
    ],
    folds: [
      ["M100 44 Q105 92 98 140", 12, 0.55],
      ["M128 96 Q120 134 132 182", 11, 0.6],
      ["M66 146 Q74 180 70 214", 9, 0.5],
      ["M28 62 Q38 68 46 76", 7, 0.45],
      ["M172 62 Q162 68 154 76", 7, 0.45],
      ["M70 102 Q82 150 72 204", 7, -0.55],
      ["M116 150 Q110 182 120 216", 6, -0.45],
      ["M52 74 L57 112", 5, -0.5],
      ["M148 74 L143 112", 5, -0.5],
    ],
    creases: [],
    seams: ["M77 23.4 L43.6 32.6", "M123 23.4 L156.4 32.6", "M44.5 33 Q48.6 52 50 71.5", "M155.5 33 Q151.4 52 150 71.5"],
    stitches: [
      path(trimmed(offset(hem, -2.6), 1.5)),
      path(trimmed(offset(hem, -3.5), 1.5)),
      path(trimmed(offset(cuffL, -2.3), 1.2)),
      path(trimmed(offset(cuffL, -3), 1.2)),
      path(trimmed(offset(cuffR, 2.3), 1.2)),
      path(trimmed(offset(cuffR, 3), 1.2)),
      path(trimmed(offset(scoop, -4.1), 1.6)),
      path(trimmed(offset(scoop, -4.8), 1.8)),
      path(trimmed(offset(backNeck, 3.1), 1)),
    ],
    ribs: [...ribsAlong(scoop, -3.6, 0.7), ...ribsAlong(backNeck, 2.6, 0.7)],
    buttons: [],
    buttonTone: "tonal",
    label: [96.4, 27.4, 7.2, 3.4],
    mark: [100, 52, 2.4],
    knit: true,
  };
})();

/* --- overshirt ------------------------------------------------------------ */

const overshirt: Spec = (() => {
  const leafL: P[] = [
    [74, 24],
    [100, 50],
    [88, 60],
    [66, 32],
  ];
  const leafR = mirror(leafL);
  const pocket = (x: number): P[] => [
    [x, 96],
    [x + 25, 96],
    [x + 25, 123],
    [x + 12.5, 127],
    [x, 123],
  ];
  const flap = (x: number) => rect(x - 1.5, 88, 28, 10);
  const open = (pts: P[], from: number, to: number) => path(pts.slice(from, to + 1));
  const stitchLeaf = (leaf: P[]) => {
    const p = inset(leaf, 0.9);
    return path([p[1], p[2], p[3]]);
  };
  const stitchPocket = (x: number) => {
    const p = inset(pocket(x), 0.8);
    return path([p[1], p[2], p[3], p[4], p[0]]);
  };
  const stitchFlap = (x: number) => {
    const p = inset(flap(x), 0.75);
    return path([p[0], p[3], p[2], p[1]]);
  };
  const hem = [...quad([51, 222], [76, 234], [100, 226], 16), ...quad([100, 226], [124, 234], [149, 222], 16).slice(1)];
  return {
    body: "M74 24 L44 34 Q34 38 31 52 L12 176 L36 182 L50 98 L51 222 Q76 234 100 226 Q124 234 149 222 L150 98 L164 182 L188 176 L169 52 Q166 38 156 34 L126 24 Z",
    extra: ["M74 24 Q100 15 126 24 L121 31 Q100 24 79 31 Z"],
    inside: ["M74 24 Q100 15 126 24 L121 31 Q100 24 79 31 Z"],
    layers: [
      ["M74 24 Q100 15 126 24 L121 31 Q100 24 79 31 Z", 0.5],
      ["M100 50 L107 54 L107 228 L100 226 Z", 0.35],
      [path(pocket(62), true), 0.32],
      [path(pocket(114), true), 0.32],
      [path(flap(62), true), 0.75],
      [path(flap(114), true), 0.75],
      [path(leafL, true), 0.85],
      [path(leafR, true), 0.85],
      ["M14.5 164 L38 169.5 L36 182 L12 176 Z", 0.32],
      ["M185.5 164 L162 169.5 L164 182 L188 176 Z", 0.32],
    ],
    folds: [
      ["M80 70 Q86 120 78 172", 11, 0.5],
      ["M128 112 Q122 162 130 208", 11, 0.55],
      ["M26 70 Q22 120 20 160", 8, 0.45],
      ["M176 70 Q180 120 182 160", 8, 0.45],
      ["M60 140 Q72 180 64 214", 8, -0.5],
      ["M140 132 Q132 172 142 210", 6, -0.45],
      ["M51 100 L54 130", 5, -0.3],
      ["M149 100 L146 130", 5, -0.3],
    ],
    creases: [],
    seams: ["M74 24 L44.5 34", "M126 24 L155.5 34", "M44.5 34.5 Q47.5 66 50 98", "M155.5 34.5 Q152.5 66 150 98", "M100 50 L100 226"],
    stitches: [
      stitchLeaf(leafL),
      stitchLeaf(leafR),
      stitchPocket(62),
      stitchPocket(114),
      stitchFlap(62),
      stitchFlap(114),
      "M100.8 51 L100.8 225.5",
      "M106.2 54.5 L106.2 227",
      "M46 35 Q49 66 51.4 97",
      "M154 35 Q151 66 148.6 97",
      open(inset([[14.5, 164], [38, 169.5], [36, 182], [12, 176]], 0.8), 0, 1),
      open(inset([[185.5, 164], [162, 169.5], [164, 182], [188, 176]], 0.8), 0, 1),
      path(trimmed(offset(hem, 1.5), 1.5)),
    ],
    ribs: [],
    buttons: [
      ...[66, 96, 126, 156, 186].map((y) => ({ x: 103.5, y, r: 1.6, holes: 4 as const })),
      { x: 74.5, y: 94.5, r: 1.25, holes: 4 },
      { x: 126.5, y: 94.5, r: 1.25, holes: 4 },
    ],
    buttonTone: "horn",
    knit: false,
  };
})();

/* --- trouser -------------------------------------------------------------- */

const trouser: Spec = (() => {
  const loops = [62, 84, 116, 138];
  const pocketL = quad([58, 30], [65, 52], [71, 64], 12);
  const pocketR = quad([142, 30], [135, 52], [129, 64], 12);
  return {
    body: "M53 30 L44 228 L94 228 L100 96 L106 228 L156 228 L147 30 Z",
    extra: ["M54 15 L146 15 L147 30.5 L53 30.5 Z", ...loops.map((x) => path(rect(x, 13.4, 4.5, 18.6), true))],
    inside: [],
    layers: [
      ["M54 15 L146 15 L147 30.5 L53 30.5 Z", 0.42],
      ...loops.map((x) => [path(rect(x, 13.4, 4.5, 18.6), true), 0.95] as [string, number]),
      ["M100 30.5 L107 30.5 L107 78 Q107 89 100 92 Z", 0.22],
      [path([[53, 30.5], ...pocketL, [51.8, 64]], true), -0.18],
      [path([[147, 30.5], ...pocketR, [148.2, 64]], true), -0.18],
    ],
    folds: [
      ["M84 100 Q87 140 82 182", 9, 0.45],
      ["M118 104 Q114 146 120 186", 8, 0.4],
      ["M90 120 Q86 170 90 222", 6, -0.55],
      ["M110 120 Q114 170 110 222", 6, -0.55],
      ["M81 31 L83 62", 3.2, 0.45],
      ["M119 31 L117 62", 3.2, 0.45],
    ],
    creases: [
      ["M71 66 L67 222", 0.55],
      ["M129 66 L133 222", 0.55],
      ["M78 30.5 L80.5 62", -0.5],
      ["M122 30.5 L119.5 62", -0.5],
    ],
    seams: ["M100 30.5 L100 92", "M53 30.5 L147 30.5", "M45 223.5 L93.8 223.5", "M106.2 223.5 L155 223.5"],
    stitches: [
      "M54.6 16 L145.4 16",
      "M54 29.4 L146 29.4",
      "M106.2 31.5 L106.2 78 Q106.2 88 100.6 90.6",
      path(offset(pocketL, -0.9)),
      path(offset(pocketR, 0.9)),
      ...loops.flatMap((x) => [`M${x + 0.6} 14.6 L${x + 3.9} 14.6`, `M${x + 0.6} 30.8 L${x + 3.9} 30.8`]),
    ],
    ribs: [],
    buttons: [{ x: 100, y: 22.5, r: 1.75, holes: 4 }],
    buttonTone: "horn",
    knit: false,
  };
})();

/* --- polo ----------------------------------------------------------------- */

const polo: Spec = (() => {
  const leafL: [P, P, P, P] = [
    [76, 20],
    [100, 40],
    [92, 56],
    [62, 36],
  ];
  const leafR = mirror(leafL) as [P, P, P, P];
  const cuffL = line([14, 72], [36, 84], 10);
  const cuffR = line([186, 72], [164, 84], 10);
  const hem = quad([50, 222], [100, 226], [150, 222], 30);
  const placket = inset(rect(95, 40, 10, 50), 0.7);
  return {
    body: "M76 22 C70 24 52 28 42 31 L14 72 L36 84 L50 72 L50 222 Q100 226 150 222 L150 72 L164 84 L186 72 L158 31 C148 28 130 24 124 22 Z",
    extra: ["M76 20 Q100 13 124 20 L118 26 Q100 21 82 26 Z"],
    inside: ["M76 20 Q100 13 124 20 L118 26 Q100 21 82 26 Z"],
    layers: [
      ["M76 20 Q100 13 124 20 L118 26 Q100 21 82 26 Z", 0.45],
      [path(rect(95, 40, 10, 50), true), 0.38],
      [path(leafL, true), 0.8],
      [path(leafR, true), 0.8],
      [band(cuffL, -4.4), 0.26],
      [band(cuffR, 4.4), 0.26],
      [band(hem, -3), 0.22],
    ],
    folds: [
      ["M128 100 Q122 140 132 192", 10, 0.55],
      ["M74 64 Q80 90 76 116", 8, 0.4],
      ["M30 60 Q40 66 46 74", 6, 0.45],
      ["M170 60 Q160 66 154 74", 6, 0.45],
      ["M70 112 Q80 160 72 206", 7, -0.55],
      ["M52 74 L57 112", 5, -0.5],
      ["M148 74 L143 112", 5, -0.5],
    ],
    creases: [],
    seams: ["M77 23.4 L43.6 32.6", "M123 23.4 L156.4 32.6", "M44.5 33 Q48.6 52 50 71.5", "M155.5 33 Q151.4 52 150 71.5"],
    stitches: [
      path([...placket, placket[0]]),
      path(trimmed(offset(hem, -2.1), 1.5)),
      path(trimmed(offset(hem, -2.8), 1.5)),
      path(trimmed(offset(cuffL, -4.9), 1)),
      path(trimmed(offset(cuffR, 4.9), 1)),
    ],
    ribs: [
      ...ribsAcross(leafL[0], leafL[1], leafL[2], leafL[3], 0.75),
      ...ribsAcross(leafR[0], leafR[1], leafR[2], leafR[3], 0.75),
      ...ribsAlong(cuffL, -4.4, 0.7),
      ...ribsAlong(cuffR, 4.4, 0.7),
    ],
    buttons: [52, 65, 78].map((y) => ({ x: 100, y, r: 1.3, holes: 2 as const })),
    buttonTone: "tonal",
    mark: [127, 64, 2],
    knit: true,
  };
})();

export const SPECS: Record<Kind, Spec> = { tee, overshirt, trouser, polo };

/**
 * Room around each photo for its baked-in shadow (garment units). A garment
 * lying flat casts a short, tight shadow; one on a hanger casts a longer one
 * onto the wall behind it.
 */
export const PHOTO_PAD = {
  flat: { x: 8, top: 4, bottom: 14 },
  hanging: { x: 14, top: 4, bottom: 30 },
} as const;
