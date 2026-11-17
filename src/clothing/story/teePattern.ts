import {
  blur,
  fbm,
  grainTile,
  hash2,
  join,
  line,
  mirrorX,
  nearest,
  offset,
  pointAt,
  polyLength,
  quad,
  ridge,
  sample,
  trim,
  vnoise,
  type P,
} from "../fabric/field";
import { drawMark, type Ctx2D } from "../fabric/mark";

/* The tee's pattern, folds, wrinkles and textures, with no three.js and no
   DOM, so the heavy texture work can run in a Web Worker (tee.worker.ts).
   Pattern units: the body is 1.0 wide (about 52 cm), x across, y from hem
   (−0.65) to neck (0.65). */

export const BOUNDS = { x0: -0.8, x1: 0.8, y0: -0.7, y1: 0.7 };
export const BW = BOUNDS.x1 - BOUNDS.x0;
export const BH = BOUNDS.y1 - BOUNDS.y0;

/* --- pattern ------------------------------------------------------------- */

const NECK_L: P = [-0.18, 0.65];
const NECK_R: P = [0.18, 0.65];
const SCOOP = quad(NECK_L, [0, 0.5], NECK_R, 48);
const BACK_NECK = quad(NECK_L, [0, 0.615], NECK_R, 32);
const hemY = (x: number) => -0.65 - 0.005 * Math.cos((x / 0.5) * (Math.PI / 2));
const HEM: P[] = Array.from({ length: 41 }, (_, i) => {
  const x = -0.5 + i / 40;
  return [x, hemY(x)] as P;
});
const SHOULDER_L = quad(NECK_L, [-0.34, 0.626], [-0.5, 0.58], 16);
const SHOULDER_R = mirrorX(SHOULDER_L);
const SIDE_R: P[] = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  return [0.5 - 0.004 * Math.sin(Math.PI * t), hemY(0.5) + (0.3 - hemY(0.5)) * t] as P;
});

export const BODY: P[] = join(
  HEM,
  SIDE_R,
  line([0.5, 0.3], [0.5, 0.58], 14),
  [...SHOULDER_R].reverse(),
  [...BACK_NECK].reverse(),
  SHOULDER_L,
  line([-0.5, 0.58], [-0.5, 0.3], 14),
  mirrorX(SIDE_R).reverse(),
).slice(0, -1);

const CUFF_L = quad([-0.78, 0.42], [-0.733, 0.318], [-0.68, 0.22], 12);
const CUFF_R = mirrorX(CUFF_L);
export const SLEEVE_L: P[] = join(
  quad([-0.5, 0.58], [-0.648, 0.516], [-0.78, 0.42], 16),
  CUFF_L,
  quad([-0.68, 0.22], [-0.585, 0.272], [-0.5, 0.3], 12),
  line([-0.5, 0.3], [-0.5, 0.58], 12),
).slice(0, -1);
export const SLEEVE_R = mirrorX(SLEEVE_L);

/** Seams, in the order they're sewn; twin rows are sewn together. */
export const STITCHES: P[][][] = (() => {
  const t = (pts: P[], a: number, b: number) => trim(pts, a, polyLength(pts) - b);
  return [
    [line([-0.491, 0.312], [-0.491, 0.57], 8)],
    [line([0.491, 0.312], [0.491, 0.57], 8)],
    [t(offset(SHOULDER_L, 0.011), 0.022, 0.012)],
    [t(offset(SHOULDER_R, -0.011), 0.022, 0.012)],
    [t(offset(CUFF_L, 0.012), 0.012, 0.012), t(offset(CUFF_L, 0.02), 0.014, 0.014)],
    [t(offset(CUFF_R, -0.012), 0.012, 0.012), t(offset(CUFF_R, -0.02), 0.014, 0.014)],
    [t(offset(HEM, 0.02), 0.012, 0.012), t(offset(HEM, 0.029), 0.012, 0.012)],
    [t(offset(SCOOP, -0.037), 0.03, 0.03), t(offset(SCOOP, -0.044), 0.034, 0.034)],
  ];
})();
export const STITCH_TOTAL = STITCHES.reduce((n, rows) => n + polyLength(rows[0]), 0);

/* --- folds --------------------------------------------------------------- */

/* Retail fold, all tucked under so the chest and collar stay on top:
   sleeves at the armholes, left side, right side, then the hem half under.
   Each radius leaves room for the layers already folded inside it. */
export const FOLDS = [
  { axis: 0, c: -0.5, s: -1, r: 0.0024 },
  { axis: 0, c: 0.5, s: 1, r: 0.0024 },
  { axis: 0, c: -0.22, s: -1, r: 0.0066 },
  { axis: 0, c: 0.22, s: 1, r: 0.0106 },
  { axis: 1, c: -0.05, s: -1, r: 0.0226 },
] as const;

/** Height of a fully folded tee, and how far its lowest layer sits below the chest. */
export const FOLDED = { below: 0.0466, thick: 0.0496 };
export const AMP_FLAT = 0.009;
export const AMP_PRESSED = 0.0006;
/** Height-field units → world units for the structural relief. */
export const GEO = 0.0018;

/** Gentle wrinkles of a tee laid on a table, 0–1. */
export function wrinkle(x: number, y: number, seed: number) {
  const o = seed * 1.7;
  const n = fbm(x * 2.4 + o, y * 2.4 - o, 3, seed) * 2 - 1;
  const w =
    0.55 * n +
    0.7 * ridge(0.55 * x - 0.83 * y + 0.06 + 0.04 * Math.sin(y * 7 + o), 0.05) * (x < 0.2 ? 1 : 0.35) +
    0.45 * ridge(0.62 * x + 0.78 * y + 0.24, 0.045) * (y < 0.25 ? 1 : 0.3) +
    0.4 * ridge(y + 0.5 + 0.025 * Math.sin(x * 11 + o), 0.03) +
    0.5 * ridge(Math.abs(x) - 0.62 + 0.4 * (y - 0.4), 0.03) * (Math.abs(x) > 0.5 ? 1 : 0) -
    0.35 * ridge(0.35 * x - 0.94 * y + 0.62, 0.04);
  return Math.min(1, Math.max(0, 0.42 + 0.5 * w));
}


/* --- textures ------------------------------------------------------------ */

/** Raw RGBA pixels (rows top to bottom) plus a small copy of the relief for the mesh. */
export type TeeData = {
  w: number;
  h: number;
  map: Uint8ClampedArray;
  normal: Uint8ClampedArray;
  stitch: Uint8ClampedArray;
  struct: Float32Array;
  sw: number;
  sh: number;
  ppu: number;
};

export function generateTeeMaps(coarse: boolean, makeCtx: (w: number, h: number) => Ctx2D): TeeData {
  const W = coarse ? 1024 : 1536;
  const H = Math.round((W * BH) / BW);
  const ppu = W / BW;
  const px = (x: number) => (x - BOUNDS.x0) * ppu;
  const py = (y: number) => (BOUNDS.y1 - y) * ppu;
  const ctx = makeCtx(W, H);
  const path = (pts: P[], close = true) => {
    const p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(px(x), py(y)) : p.moveTo(px(x), py(y))));
    if (close) p.closePath();
    return p;
  };
  const read = () => {
    const d = ctx.getImageData(0, 0, W, H).data;
    const out = new Float32Array(W * H);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
    return out;
  };
  const mask = (draw: () => void) => {
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    draw();
    ctx.restore();
    return read();
  };
  const band = (a: P[], b: P[]) => path([...a, ...[...b].reverse()]);

  const body = path(BODY);
  const sleeves = [path(SLEEVE_L), path(SLEEVE_R)];
  const insideBack = band(BACK_NECK, SCOOP);
  const S = mask(() => [body, ...sleeves].forEach((p) => ctx.fill(p)));
  const IB = blur(mask(() => ctx.fill(insideBack)), W, H, 1);
  const FB = blur(
    mask(() => {
      ctx.clip(body);
      ctx.fill(band(SCOOP, offset(SCOOP, -0.032)));
    }),
    W,
    H,
    1,
  );
  const BB = blur(
    mask(() => {
      ctx.clip(insideBack);
      ctx.fill(band(BACK_NECK, offset(BACK_NECK, -0.024)));
    }),
    W,
    H,
    1,
  );
  const HB = blur(
    mask(() => {
      ctx.save();
      ctx.clip(body);
      ctx.fill(band(HEM, offset(HEM, 0.034)));
      ctx.restore();
      ctx.save();
      ctx.clip(sleeves[0]);
      ctx.fill(band(CUFF_L, offset(CUFF_L, 0.028)));
      ctx.restore();
      ctx.clip(sleeves[1]);
      ctx.fill(band(CUFF_R, offset(CUFF_R, -0.028)));
    }),
    W,
    H,
    1,
  );
  const armholes = [line([-0.5, 0.3], [-0.5, 0.58], 2), line([0.5, 0.3], [0.5, 0.58], 2)];
  const SEAM = blur(
    mask(() => {
      ctx.lineWidth = 0.0024 * ppu;
      [offset(SHOULDER_L, 0.005), offset(SHOULDER_R, -0.005), ...armholes].forEach((pts) => ctx.stroke(path(pts, false)));
    }),
    W,
    H,
    1,
  );
  const ALLOW = blur(
    mask(() => {
      ctx.lineWidth = 0.009 * ppu;
      ctx.clip(body);
      [offset(SHOULDER_L, 0.01), offset(SHOULDER_R, -0.01), line([-0.494, 0.3], [-0.494, 0.58], 2), line([0.494, 0.3], [0.494, 0.58], 2)].forEach(
        (pts) => ctx.stroke(path(pts, false)),
      );
    }),
    W,
    H,
    2,
  );
  const LOGO = blur(
    mask(() => drawMark(ctx, px(0), py(0.43), 0.02 * ppu, "#fff", "#fff")),
    W,
    H,
    1,
  );
  const edge = blur(S, W, H, Math.max(2, Math.round(0.004 * ppu)));

  // structural relief: neckband, hems, inside back, seams and rolled edges
  const hs = new Float32Array(W * H);
  for (let i = 0; i < hs.length; i++) {
    if (S[i] <= 0) continue;
    hs[i] =
      S[i] *
      (1.0 * FB[i] + 0.4 * HB[i] - 0.9 * IB[i] + 0.5 * BB[i] - 0.5 * SEAM[i] + 0.3 * ALLOW[i] + 0.9 * (edge[i] - 1));
  }

  // fine relief: rib on the neckbands, knit grain and pressed creases
  const knit = grainTile(128, 0, 3, 7);
  const half = { w: W >> 1, h: H >> 1 };
  const crease = new Float32Array(half.w * half.h);
  const heather = new Float32Array(half.w * half.h);
  for (let y = 0; y < half.h; y++) {
    for (let x = 0; x < half.w; x++) {
      const u = BOUNDS.x0 + (x * 2) / ppu;
      const v = BOUNDS.y1 - (y * 2) / ppu;
      const ru = u * 0.94 - v * 0.34;
      const rv = u * 0.34 + v * 0.94;
      const c = 1 - Math.abs(2 * fbm(ru * 5, rv * 12, 3, 3) - 1);
      crease[y * half.w + x] = c * c;
      heather[y * half.w + x] = 0.6 * vnoise(u * 60, v * 22, 5) + 0.4 * vnoise(u * 260, v * 70, 6);
    }
  }
  const hd = new Float32Array(W * H);
  const rib = (pts: P[], x: number, y: number) => {
    const s = nearest(BOUNDS.x0 + x / ppu, BOUNDS.y1 - y / ppu, pts)[3];
    return Math.sin((s / 0.0042) * Math.PI * 2);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (S[i] <= 0) continue;
      let d = 0.18 * knit[(y & 127) * 128 + (x & 127)] + 0.6 * sample(crease, half.w, half.h, x / 2, y / 2);
      if (FB[i] > 0.05) d += 0.32 * FB[i] * rib(SCOOP, x, y);
      else if (BB[i] > 0.05) d += 0.28 * BB[i] * rib(BACK_NECK, x, y);
      hd[i] = d * S[i];
    }
  }

  // normal map from the combined relief
  const hn = new Float32Array(W * H);
  for (let i = 0; i < hn.length; i++) hn[i] = hs[i] * 2.4 + hd[i];
  const nImg = ctx.createImageData(W, H);
  const K = 1.1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = (hn[y * W + Math.min(W - 1, x + 1)] - hn[y * W + Math.max(0, x - 1)]) * 0.5 * K;
      const dy = (hn[Math.min(H - 1, y + 1) * W + x] - hn[Math.max(0, y - 1) * W + x]) * 0.5 * K;
      const len = Math.hypot(dx, dy, 1);
      nImg.data[i * 4] = ((-dx / len) * 0.5 + 0.5) * 255;
      nImg.data[i * 4 + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      nImg.data[i * 4 + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      nImg.data[i * 4 + 3] = 255;
    }
  }

  // albedo detail (tinted by the material colour): heather, baked occlusion, the embroidered mark
  const hao = new Float32Array(W * H);
  for (let i = 0; i < hao.length; i++) hao[i] = hs[i] * 2.4 + hd[i] * 0.35;
  const near = blur(hao, W, H, Math.max(2, Math.round(0.004 * ppu)));
  const far = blur(hao, W, H, Math.max(4, Math.round(0.014 * ppu)));
  const aImg = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const occl = 1 - 0.55 * Math.max(0, near[i] - hao[i]) - 0.22 * Math.max(0, far[i] - hao[i]);
      const fleck = hash2(x, y, 9);
      let v = 0.94 + (heather[(y >> 1) * half.w + Math.min(half.w - 1, x >> 1)] - 0.5) * 0.07;
      if (fleck > 0.9975) v += 0.07;
      else if (fleck < 0.0025) v -= 0.06;
      v *= Math.min(1, Math.max(0.5, occl));
      v *= 1 + 0.2 * LOGO[i];
      v *= 1 - 0.07 * IB[i];
      const g = Math.round(Math.min(1, Math.max(0, v)) * 255);
      aImg.data[i * 4] = aImg.data[i * 4 + 1] = aImg.data[i * 4 + 2] = g;
      aImg.data[i * 4 + 3] = 255;
    }
  }

  // stitch mask: R thread, G when it's sewn (0–1, white = never), B its tiny shadow
  const DASH = 0.0062;
  const GAP = 0.0034;
  const dashes: { a: P; b: P; order: number }[] = [];
  let run = 0;
  for (const rows of STITCHES) {
    const len = polyLength(rows[0]);
    for (const row of rows) {
      const rl = polyLength(row);
      for (let s = 0; s + DASH <= rl; s += DASH + GAP) {
        const [ax, ay] = pointAt(row, s);
        const [bx, by] = pointAt(row, s + DASH);
        dashes.push({ a: [ax, ay], b: [bx, by], order: (run + (s / rl) * len) / STITCH_TOTAL });
      }
    }
    run += len;
  }
  const strokeDashes = (width: number, style: (o: number) => string, dx = 0, dy = 0) => {
    ctx.lineWidth = width * ppu;
    for (const d of dashes) {
      ctx.strokeStyle = style(d.order);
      ctx.beginPath();
      ctx.moveTo(px(d.a[0]) + dx, py(d.a[1]) + dy);
      ctx.lineTo(px(d.b[0]) + dx, py(d.b[1]) + dy);
      ctx.stroke();
    }
  };
  const R = mask(() => strokeDashes(0.0017, () => "#fff"));
  const B = blur(
    mask(() => strokeDashes(0.0022, () => "#fff", 0.9, -0.9)),
    W,
    H,
    1,
  );
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";
  strokeDashes(0.0055, (o) => {
    const g = Math.round(Math.min(254, o * 254));
    return `rgb(${g},${g},${g})`;
  });
  ctx.restore();
  const G = ctx.getImageData(0, 0, W, H).data;
  const sImg = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    sImg.data[i * 4] = R[i] * 255;
    sImg.data[i * 4 + 1] = G[i * 4];
    sImg.data[i * 4 + 2] = Math.max(0, B[i] - R[i]) * 255;
    sImg.data[i * 4 + 3] = 255;
  }

  // a quarter-resolution copy of the structural relief for the mesh
  const sw = W >> 2;
  const sh = H >> 2;
  const small = blur(hs, W, H, 2);
  const struct = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) struct[y * sw + x] = small[(y * 4 + 2) * W + x * 4 + 2];

  return { w: W, h: H, map: aImg.data, normal: nImg.data, stitch: sImg.data, struct, sw, sh, ppu: ppu / 4 };
}

