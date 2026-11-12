import * as THREE from "three";
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
  pointInPoly,
  polyLength,
  quad,
  ridge,
  sample,
  trim,
  vnoise,
  type P,
} from "../fabric/field";
import { drawMark } from "./textures";

/* A soft, sewn tee.

   Each pattern piece (body, two sleeves) is a dense mesh lifted by a height
   field: gentle wrinkles, a raised rib neckband, turned-up hems, seams and the
   inside of the back neck seen through the neckline. Folds are rounded,
   cylindrical bends applied one after another, so a folded tee has soft,
   layered edges like the real thing. Stitching is tone-on-tone and is
   "sewn in" by a shader as the story plays. Pattern units: the body is 1.0
   wide (about 52 cm), x across, y from hem (−0.65) to neck (0.65). */

export const BOUNDS = { x0: -0.8, x1: 0.8, y0: -0.7, y1: 0.7 };
const BW = BOUNDS.x1 - BOUNDS.x0;
const BH = BOUNDS.y1 - BOUNDS.y0;

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

const BODY: P[] = join(
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
const SLEEVE_L: P[] = join(
  quad([-0.5, 0.58], [-0.648, 0.516], [-0.78, 0.42], 16),
  CUFF_L,
  quad([-0.68, 0.22], [-0.585, 0.272], [-0.5, 0.3], 12),
  line([-0.5, 0.3], [-0.5, 0.58], 12),
).slice(0, -1);
const SLEEVE_R = mirrorX(SLEEVE_L);

/** Seams, in the order they're sewn; twin rows are sewn together. */
const STITCHES: P[][][] = (() => {
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
const STITCH_TOTAL = STITCHES.reduce((n, rows) => n + polyLength(rows[0]), 0);

/* --- folds --------------------------------------------------------------- */

/* Retail fold, all tucked under so the chest and collar stay on top:
   sleeves at the armholes, left side, right side, then the hem half under.
   Each radius leaves room for the layers already folded inside it. */
const FOLDS = [
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
const GEO = 0.0018;

/* --- textures ------------------------------------------------------------ */

export type TeeTextures = {
  map: THREE.Texture;
  normal: THREE.Texture;
  stitch: THREE.Texture;
  struct: { buf: Float32Array; w: number; h: number; ppu: number };
};

export function teeTextures(coarse: boolean): TeeTextures {
  const W = coarse ? 1024 : 1536;
  const H = Math.round((W * BH) / BW);
  const ppu = W / BW;
  const px = (x: number) => (x - BOUNDS.x0) * ppu;
  const py = (y: number) => (BOUNDS.y1 - y) * ppu;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
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
  const nCanvas = document.createElement("canvas");
  nCanvas.width = W;
  nCanvas.height = H;
  nCanvas.getContext("2d")!.putImageData(nImg, 0, 0);

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
  const aCanvas = document.createElement("canvas");
  aCanvas.width = W;
  aCanvas.height = H;
  aCanvas.getContext("2d")!.putImageData(aImg, 0, 0);

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
  ctx.putImageData(sImg, 0, 0);

  // a quarter-resolution copy of the structural relief for the mesh
  const sw = W >> 2;
  const sh = H >> 2;
  const small = blur(hs, W, H, 2);
  const struct = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) struct[y * sw + x] = small[(y * 4 + 2) * W + x * 4 + 2];

  const map = new THREE.CanvasTexture(aCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const normal = new THREE.CanvasTexture(nCanvas);
  normal.anisotropy = 8;
  const stitch = new THREE.CanvasTexture(cv);
  stitch.anisotropy = 8;
  return { map, normal, stitch, struct: { buf: struct, w: sw, h: sh, ppu: ppu / 4 } };
}

/* --- material ------------------------------------------------------------ */

function teeMaterial(color: string, tex: TeeTextures) {
  const uniforms = { uStitch: { value: tex.stitch }, uSew: { value: 1 } };
  const base = new THREE.Color(color);
  const mat = new THREE.MeshPhysicalMaterial({
    color: base.clone().multiplyScalar(1.12),
    map: tex.map,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.92,
    sheen: 0.75,
    sheenRoughness: 0.55,
    sheenColor: base.clone().lerp(new THREE.Color(0xffffff), 0.5),
    side: THREE.DoubleSide,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uStitch;\nuniform float uSew;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec4 st = texture2D( uStitch, vMapUv );
        float sewn = 1.0 - step( uSew, st.g );
        diffuseColor.rgb *= 1.0 - 0.42 * st.b * sewn;
        diffuseColor.rgb = mix( diffuseColor.rgb, min( diffuseColor.rgb * 1.32 + 0.04, vec3( 1.0 ) ), st.r * sewn );`,
      );
  };
  mat.customProgramCacheKey = () => "auvier-tee";
  return { mat, uniforms };
}

/* --- mesh ---------------------------------------------------------------- */

type Piece = {
  geo: THREE.BufferGeometry;
  px: Float32Array;
  py: Float32Array;
  hs: Float32Array;
  wr: Float32Array;
  side: -1 | 0 | 1;
};

/** Gentle wrinkles of a tee laid on a table, 0–1. */
function wrinkle(x: number, y: number, seed: number) {
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

function buildPiece(outline: P[], tex: TeeTextures, step: number, side: -1 | 0 | 1, seed: number): Piece {
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const x0 = Math.min(...xs) - step;
  const y0 = Math.min(...ys) - step;
  const cols = Math.ceil((Math.max(...xs) + step - x0) / step) + 1;
  const rows = Math.ceil((Math.max(...ys) + step - y0) / step) + 1;
  const inside = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) inside[j * cols + i] = pointInPoly(x0 + i * step, y0 + j * step, outline) ? 1 : 0;

  const tris: number[] = [];
  // any triangle touching the inside is kept; its outside corners snap to the edge below
  const keep = (a: number, b: number, c: number) => {
    if (inside[a] + inside[b] + inside[c] > 0) tris.push(a, b, c);
  };
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if ((i + j) % 2) {
        keep(a, b, d);
        keep(a, d, c);
      } else {
        keep(a, b, c);
        keep(b, d, c);
      }
    }
  }

  // compact, snapping outside vertices onto the outline for a clean edge
  const remap = new Int32Array(cols * rows).fill(-1);
  const pxs: number[] = [];
  const pys: number[] = [];
  const index: number[] = [];
  for (const v of tris) {
    if (remap[v] < 0) {
      remap[v] = pxs.length;
      let x = x0 + (v % cols) * step;
      let y = y0 + Math.floor(v / cols) * step;
      if (!inside[v]) [x, y] = nearest(x, y, outline, true);
      pxs.push(x);
      pys.push(y);
    }
    index.push(remap[v]);
  }

  const n = pxs.length;
  const px = Float32Array.from(pxs);
  const py = Float32Array.from(pys);
  const hs = new Float32Array(n);
  const wr = new Float32Array(n);
  const uv = new Float32Array(n * 2);
  const { buf, w, h, ppu } = tex.struct;
  for (let i = 0; i < n; i++) {
    uv[i * 2] = (px[i] - BOUNDS.x0) / BW;
    uv[i * 2 + 1] = (py[i] - BOUNDS.y0) / BH;
    hs[i] = sample(buf, w, h, (px[i] - BOUNDS.x0) * ppu - 0.5, (BOUNDS.y1 - py[i]) * ppu - 0.5) * GEO;
    wr[i] = wrinkle(px[i], py[i], seed);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  return { geo, px, py, hs, wr, side };
}

export type TeeState = {
  /** 0 → sleeves apart, 1 → sleeves joined to the body */
  join: number;
  /** how much of the stitching is sewn, 0–1 */
  sew: number;
  /** progress of each fold, 0–1: sleeves L/R, side L/R, hem */
  fold: [number, number, number, number, number];
  /** wrinkle height (flat on the table vs pressed) */
  amp: number;
};

export class Tee {
  root = new THREE.Group();
  private pieces: Piece[];
  private uniforms: { uSew: { value: number } };
  private key = "";
  private label: THREE.Mesh | null = null;
  private labelBase: Float32Array | null = null;
  private seed: number;

  constructor(
    tex: TeeTextures,
    color: string,
    opts: { seed?: number; coarse?: boolean; label?: THREE.Texture } = {},
  ) {
    const seed = (this.seed = opts.seed ?? 1);
    const step = opts.coarse ? 0.011 : 0.008;
    const { mat, uniforms } = teeMaterial(color, tex);
    this.uniforms = uniforms;
    this.pieces = [
      buildPiece(BODY, tex, step, 0, seed),
      buildPiece(SLEEVE_L, tex, step, -1, seed),
      buildPiece(SLEEVE_R, tex, step, 1, seed),
    ];
    for (const piece of this.pieces) {
      const mesh = new THREE.Mesh(piece.geo, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.root.add(mesh);
    }

    // the woven label inside the back neck, partly tucked under the front band
    if (opts.label) {
      const geo = new THREE.PlaneGeometry(0.07, 0.03, 6, 3);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0, -0.592);
      this.labelBase = Float32Array.from(geo.attributes.position.array as Float32Array);
      this.label = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: opts.label, roughness: 0.78 }));
      this.label.receiveShadow = true;
      this.root.add(this.label);
    }
  }

  setLabelMap(map: THREE.Texture) {
    if (!this.label) return;
    const m = this.label.material as THREE.MeshStandardMaterial;
    m.map?.dispose();
    m.map = map;
    m.needsUpdate = true;
  }

  set(st: TeeState) {
    this.uniforms.uSew.value = st.sew;
    const key = [st.join, st.amp, ...st.fold].map((v) => v.toFixed(4)).join();
    if (key === this.key) return;
    this.key = key;
    const phi = st.fold.map((f) => f * Math.PI);
    for (const piece of this.pieces) {
      const pos = piece.geo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const ox = piece.side * 0.26 * (1 - st.join);
      const oy = piece.side ? 0.06 * (1 - st.join) : 0;
      for (let i = 0; i < piece.px.length; i++) {
        let vx = piece.px[i] + ox;
        let vy = piece.py[i] + oy;
        let h = piece.hs[i] + piece.wr[i] * st.amp;
        for (let k = 0; k < FOLDS.length; k++) {
          if (phi[k] <= 0) continue;
          const { axis, c, s, r } = FOLDS[k];
          const d = ((axis ? vy : vx) - c) * s;
          if (d <= 0) continue;
          // wrap around a cylinder of radius r below the cloth, then lie flat under it
          const rho = r + h;
          const a = d / r;
          let X: number;
          let Z: number;
          if (a <= phi[k]) {
            X = rho * Math.sin(a);
            Z = -r + rho * Math.cos(a);
          } else {
            const rest = d - r * phi[k];
            X = rho * Math.sin(phi[k]) + rest * Math.cos(phi[k]);
            Z = -r + rho * Math.cos(phi[k]) - rest * Math.sin(phi[k]);
          }
          if (axis) vy = c + s * X;
          else vx = c + s * X;
          h = Z;
        }
        arr[i * 3] = vx;
        arr[i * 3 + 1] = h;
        arr[i * 3 + 2] = -vy;
      }
      pos.needsUpdate = true;
      piece.geo.computeVertexNormals();
      piece.geo.computeBoundingSphere();
    }

    // the label rides on the inside back, which never folds
    if (this.label && this.labelBase) {
      const pos = this.label.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = this.labelBase[i * 3];
        const y = -this.labelBase[i * 3 + 2];
        arr[i * 3 + 1] = -0.9 * GEO + wrinkle(x, y, this.seed) * st.amp + 0.0005;
      }
      pos.needsUpdate = true;
      this.label.geometry.computeVertexNormals();
    }
  }

  /** Where the needle is (local coords) when `sew` of the stitching is done. */
  stitchHead(sew: number, amp: number, out: THREE.Vector3) {
    let target = sew * STITCH_TOTAL;
    for (const rows of STITCHES) {
      const len = polyLength(rows[0]);
      if (target <= len) {
        let x = 0;
        let y = 0;
        for (const row of rows) {
          const [rx, ry] = pointAt(row, (target / len) * polyLength(row));
          x += rx / rows.length;
          y += ry / rows.length;
        }
        return out.set(x, wrinkle(x, y, this.seed) * amp + 0.0015, -y);
      }
      target -= len;
    }
    return null;
  }
}
