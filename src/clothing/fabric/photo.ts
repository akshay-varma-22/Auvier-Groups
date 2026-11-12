import { blur, fbm, grainTile, hash2, sample, vnoise } from "./field";
import { SPECS, type Kind, type Spec } from "./specs";

/* Photographic garment flats, rendered on the CPU (in a worker).

   1. Each garment's construction is painted into a height field: two plies
      with softly rolled edges, raised collars, plackets, pockets and bands,
      seams with puffed allowances, puckered topstitching, rib knit, folds,
      pressed creases and fine wrinkles (gravity drape when it hangs).
   2. The height field is lit like a soft window light from the top left:
      wrapped diffuse, ambient occlusion and real cast shadows (a collar
      shadows the chest, a flap shadows its pocket), plus a cotton sheen.
   3. The garment colour is applied last, so changing colourway only
      re-runs the cheap final step. Buttons, the neck label and the hanger
      are painted on top with ordinary canvas gradients. */

export type PhotoRequest = { kind: Kind; color: string; hanger: boolean; scale: number };

type Geo = {
  w: number;
  h: number;
  U: number;
  oy: number;
  spec: Spec;
  kind: Kind;
  hanger: boolean;
  M: Float32Array;
  S: Float32Array;
  K: Float32Array;
  D: Float32Array;
  T: Float32Array;
  /** Where a point of the pattern ends up after the cloth warp (garment units). */
  moved: (x: number, y: number) => [number, number];
};

const geos = new Map<string, Geo>();
const path2d = new Map<string, Path2D>();
const P2 = (d: string) => {
  let p = path2d.get(d);
  if (!p) path2d.set(d, (p = new Path2D(d)));
  return p;
};

const L = (() => {
  const v = [-0.5, -0.6, 0.62];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / n);
})();
const L_FLAT = (L[2] + 0.3) / 1.3;

function surface(w: number, h: number) {
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d", { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  return { c, g };
}

function geometry(kind: Kind, hanger: boolean, U: number): Geo {
  const key = `${kind}|${hanger}|${U}`;
  const hit = geos.get(key);
  if (hit) return hit;

  const spec = SPECS[kind];
  const oy = hanger ? 46 : 0;
  const w = Math.round(200 * U);
  const h = Math.round((240 + oy) * U);
  const N = w * h;
  const { g } = surface(w, h);
  const r = (units: number) => Math.max(1, Math.round(units * U));

  // cloth is never ruler-straight: every painted shape is nudged by the same
  // gentle displacement field, so edges, hems and bands wander together
  const hw = w >> 1;
  const hh = h >> 1;
  const warpX = new Float32Array(hw * hh);
  const warpY = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const u = (x * 2) / U;
      const v = (y * 2) / U;
      warpX[y * hw + x] = (fbm(u / 22, v / 22, 2, 41) - 0.5) * 1.4 * U;
      warpY[y * hw + x] = (fbm(u / 22, v / 22, 2, 43) - 0.5) * 1.4 * U;
    }
  }
  const warp = (src: Float32Array) => {
    const out = new Float32Array(N);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = sample(warpX, hw, hh, x / 2, y / 2);
        const dy = sample(warpY, hw, hh, x / 2, y / 2);
        out[y * w + x] = sample(src, w, h, x + dx, y + dy);
      }
    }
    return out;
  };
  const paint = (fn: () => void) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.setLineDash([]);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    g.setTransform(U, 0, 0, U, 0, oy * U);
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.lineCap = "round";
    g.lineJoin = "round";
    fn();
    const d = g.getImageData(0, 0, w, h).data;
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = d[i * 4] / 255;
    return warp(out);
  };

  // --- silhouette and height (in garment units) ---
  const M = paint(() => {
    g.fill(P2(spec.body));
    spec.extra.forEach((d) => g.fill(P2(d)));
  });
  const H = new Float32Array(N);
  const roll = blur(M, w, h, r(0.7));
  for (let i = 0; i < N; i++) H[i] = 0.6 * roll[i];

  for (const [d, ht] of spec.layers) {
    const layer = blur(
      paint(() => g.fill(P2(d))),
      w,
      h,
      r(0.22),
      1,
    );
    for (let i = 0; i < N; i++) H[i] += ht * layer[i];
  }

  const inside = spec.inside.length
    ? blur(
        paint(() => spec.inside.forEach((d) => g.fill(P2(d)))),
        w,
        h,
        r(0.3),
        1,
      )
    : null;
  if (inside) for (let i = 0; i < N; i++) H[i] -= 0.38 * inside[i];

  for (const [d, width, depth] of spec.folds) {
    const fold = blur(
      paint(() => {
        g.lineWidth = width * 0.45;
        g.stroke(P2(d));
      }),
      w,
      h,
      r(width * 0.3),
    );
    for (let i = 0; i < N; i++) H[i] += depth * 2.2 * fold[i] * M[i];
  }

  for (const [d, depth] of spec.creases) {
    const crease = blur(
      paint(() => {
        g.lineWidth = 0.7;
        g.stroke(P2(d));
      }),
      w,
      h,
      r(0.45),
    );
    for (let i = 0; i < N; i++) H[i] += depth * 1.2 * crease[i] * M[i];
  }

  if (spec.seams.length) {
    const seam = paint(() => {
      g.lineWidth = 0.42;
      spec.seams.forEach((d) => g.stroke(P2(d)));
    });
    const puff = blur(seam, w, h, r(0.9));
    const groove = blur(seam, w, h, r(0.12), 1);
    for (let i = 0; i < N; i++) H[i] += (0.5 * puff[i] - 0.3 * groove[i]) * M[i];
  }

  // topstitching: the thread sits proud, the cloth puckers around it
  const T = paint(() => {
    g.lineWidth = 0.3;
    g.lineCap = "butt";
    g.setLineDash([0.78, 0.46]);
    spec.stitches.forEach((d) => g.stroke(P2(d)));
  });
  const pucker = blur(
    paint(() => {
      g.lineWidth = 0.5;
      spec.stitches.forEach((d) => g.stroke(P2(d)));
    }),
    w,
    h,
    r(0.45),
  );
  for (let i = 0; i < N; i++) H[i] += (0.1 * T[i] - 0.12 * pucker[i]) * M[i];

  if (spec.ribs.length) {
    const rib = blur(
      paint(() => {
        g.lineWidth = 0.3;
        spec.ribs.forEach((d) => g.stroke(P2(d)));
      }),
      w,
      h,
      r(0.1),
      1,
    );
    for (let i = 0; i < N; i++) H[i] += 0.13 * rib[i] * M[i];
  }

  const mark = spec.mark
    ? blur(
        paint(() => {
          const [x, y, s] = spec.mark!;
          g.lineWidth = s * 0.32;
          g.beginPath();
          g.moveTo(x - s, y + s);
          g.lineTo(x, y - s);
          g.lineTo(x + s, y + s);
          g.stroke();
          g.beginPath();
          g.arc(x, y + s * 0.35, s * 0.24, 0, Math.PI * 2);
          g.fill();
        }),
        w,
        h,
        1,
        1,
      )
    : null;
  if (mark) for (let i = 0; i < N; i++) H[i] += 0.14 * mark[i];

  // wrinkles (and a gravity drape when hanging), noise at half resolution
  const wrinkles = new Float32Array(hw * hh);
  const ang = hanger ? 0.08 : 0.35;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const tone = new Float32Array(hw * hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const u = (x * 2) / U;
      const v = (y * 2) / U - oy;
      // a gentle undulation plus a few long, soft creases running down the garment
      const au = u * ca - v * sa;
      const av = u * sa + v * ca;
      const c = 1 - Math.abs(2 * fbm(au / 13, av / 34, 3, 5) - 1);
      let n = 0.38 * (fbm(u / 16, v / 16, 3, 2) - 0.5) + 0.32 * c * c;
      if (hanger) n += 1.3 * (fbm(u / 9, v / 70, 2, 4) - 0.5) * Math.min(1, Math.max(0, (v - 30) / 40));
      wrinkles[y * hw + x] = n;
      tone[y * hw + x] = spec.knit
        ? 0.5 * vnoise(u / 1.1, v / 2.6, 8) + 0.5 * vnoise(u / 0.45, v / 1.1, 9)
        : 0.6 * vnoise((u + v) / 3, (v - u) / 9, 8) + 0.4 * vnoise(u / 0.9, v / 0.9, 9);
    }
  }
  const smooth = blur(wrinkles, hw, hh, Math.max(1, Math.round(U * 0.6)));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      H[i] += sample(smooth, hw, hh, x / 2, y / 2) * M[i];
    }
  }

  // fine weave/knit grain (normals only)
  const grain = spec.knit ? grainTile(64, 0, 2, 13) : grainTile(64, 1, 1, 17);
  const twill = (2 * Math.PI) / Math.max(2.2, 0.55 * U);

  // --- lighting ---
  const Hp = new Float32Array(N);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const fine = spec.knit ? 0.05 * grain[(y & 63) * 64 + (x & 63)] : 0.035 * grain[(y & 63) * 64 + (x & 63)] + 0.03 * Math.sin((x + y) * twill);
      Hp[i] = (H[i] + fine * M[i]) * U;
    }
  }
  const near = blur(H, w, h, r(1.1));
  const far = blur(H, w, h, r(4));
  const S = new Float32Array(N);
  const K = new Float32Array(N);
  const D = new Float32Array(N);
  const lx = L[0] / Math.hypot(L[0], L[1]);
  const ly = L[1] / Math.hypot(L[0], L[1]);
  const rise = L[2] / Math.hypot(L[0], L[1]);
  const reach = Math.ceil(4.5 * U);
  const soft = 1.1 * U;
  const norm = 0.26 + 0.8 * L_FLAT;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (M[i] <= 0.002) continue;
      const gx = (Hp[i + 1] - Hp[i - 1]) * 0.5;
      const gy = (Hp[i + w] - Hp[i - w]) * 0.5;
      const len = Math.hypot(gx, gy, 1);
      const nx = -gx / len;
      const ny = -gy / len;
      const nz = 1 / len;
      const ndl = nx * L[0] + ny * L[1] + nz * L[2];
      const diff = Math.max(0, (ndl + 0.3) / 1.3);

      // cast shadow: walk towards the light and see if anything rises above the ray
      let block = 0;
      const base = Hp[i];
      for (let k = 1; k <= reach; k++) {
        const fx = x + lx * k;
        const fy = y + ly * k;
        if (fx < 0 || fy < 0 || fx >= w - 1 || fy >= h - 1) break;
        const over = sample(Hp, w, h, fx, fy) - base - k * rise;
        if (over > block) block = over;
      }
      const vis = 1 - Math.min(1, block / soft) * 0.7;

      const ao = Math.min(1, Math.max(0.42, 1 - 0.9 * Math.max(0, near[i] - H[i]) - 0.32 * Math.max(0, far[i] - H[i])));
      const amb = 0.55 + 0.45 * nz;
      // a softbox up and to the left: light falls off gently across the garment
      const fall = 1.05 - 0.1 * Math.hypot(x / w, (y / h) * 0.9);
      S[i] = ((0.26 * amb * ao + 0.8 * diff * vis * (0.6 + 0.4 * ao)) / norm) * fall;
      K[i] = Math.pow(1 - nz, 1.5) * (0.4 + 0.6 * Math.max(0, ndl));

      const t = tone[(y >> 1) * hw + Math.min(hw - 1, x >> 1)];
      const fleck = hash2(x, y, 31);
      let dd = 1 + (t - 0.5) * (spec.knit ? 0.07 : 0.06);
      if (spec.knit && fleck > 0.996) dd += 0.06;
      if (inside) dd *= 1 - 0.12 * inside[i];
      if (mark) dd *= 1 + 0.16 * mark[i];
      D[i] = dd;
    }
  }

  const moved = (x: number, y: number): [number, number] => {
    const px = x * U;
    const py = (y + oy) * U;
    return [x - sample(warpX, hw, hh, px / 2, py / 2) / U, y - sample(warpY, hw, hh, px / 2, py / 2) / U];
  };
  const geo = { w, h, U, oy, spec, kind, hanger, M, S, K, D, T, moved };
  geos.set(key, geo);
  return geo;
}

/* --- colour -------------------------------------------------------------- */

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const shoulder = (c: number) => (c < 0.82 ? c : 0.82 + 0.18 * (1 - Math.exp(-(c - 0.82) / 0.18)));

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const css = (rgb: number[], a = 1) => `rgba(${rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)).join(",")},${a})`;
const mixRgb = (a: number[], b: number[], t: number) => a.map((c, i) => c + (b[i] - c) * t);

export function render(req: PhotoRequest): ImageBitmap {
  const geo = geometry(req.kind, req.hanger, req.scale);
  const { w, h, U, oy, spec, M, S, K, D, T } = geo;
  const srgb = hexRgb(req.color);
  const lin = srgb.map(toLin);
  const luma = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  // tone-on-tone thread: a little lighter (more so on dark cloth)
  const thread = lin.map((c) => c * (luma < 0.08 ? 1.7 : 1.13) + (luma < 0.08 ? 0.02 : 0.008));
  const sheen = lin.map((c) => 0.04 + c * 0.35);

  const cloth = surface(w, h);
  const img = cloth.g.createImageData(w, h);
  const px = img.data;
  for (let i = 0; i < w * h; i++) {
    const a = M[i];
    if (a <= 0.002) continue;
    const s = S[i];
    const t = T[i];
    for (let k = 0; k < 3; k++) {
      let c = lin[k] * D[i] * s + sheen[k] * K[i] * 0.35;
      c = c * (1 - t) + thread[k] * Math.min(1.15, s * 1.04) * t;
      px[i * 4 + k] = Math.round(toSrgb(shoulder(Math.max(0, c))) * 255);
    }
    px[i * 4 + 3] = Math.round(a * 255);
  }
  cloth.g.putImageData(img, 0, 0);

  const out = surface(w, h);
  const g = out.g;
  g.setTransform(U, 0, 0, U, 0, oy * U);
  if (req.hanger && req.kind !== "trouser") drawHanger(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(cloth.c, 0, 0);
  g.setTransform(U, 0, 0, U, 0, oy * U);

  // buttons
  const horn = [0.36, 0.28, 0.21];
  const btn = spec.buttonTone === "horn" ? horn : mixRgb(srgb, [1, 0.98, 0.94], 0.28);
  const threadCss = css(thread.map(toSrgb));
  for (const raw of spec.buttons) {
    const [bx, by] = geo.moved(raw.x, raw.y);
    const b = { ...raw, x: bx, y: by };
    g.save();
    g.shadowColor = "rgba(25,18,10,0.38)";
    g.shadowBlur = 0.9 * U;
    g.shadowOffsetX = 0.3 * U;
    g.shadowOffsetY = 0.4 * U;
    g.fillStyle = css(btn);
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const body = g.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.45, b.r * 0.05, b.x, b.y, b.r * 1.05);
    body.addColorStop(0, css(mixRgb(btn, [1, 1, 1], 0.32)));
    body.addColorStop(0.55, css(btn));
    body.addColorStop(1, css(btn.map((c) => c * 0.7)));
    g.fillStyle = body;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fill();
    // the dished centre
    const dish = g.createLinearGradient(b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r);
    dish.addColorStop(0, "rgba(0,0,0,0.16)");
    dish.addColorStop(1, "rgba(255,255,255,0.14)");
    g.fillStyle = dish;
    g.beginPath();
    g.arc(b.x, b.y, b.r * 0.66, 0, Math.PI * 2);
    g.fill();
    const o = b.r * 0.24;
    const holes: [number, number][] = b.holes === 4 ? [[-o, -o], [o, -o], [-o, o], [o, o]] : [[-o, 0], [o, 0]];
    g.strokeStyle = threadCss;
    g.lineWidth = b.r * 0.16;
    g.lineCap = "round";
    g.beginPath();
    if (b.holes === 4) {
      g.moveTo(b.x - o, b.y - o);
      g.lineTo(b.x + o, b.y + o);
      g.moveTo(b.x + o, b.y - o);
      g.lineTo(b.x - o, b.y + o);
    } else {
      g.moveTo(b.x - o, b.y);
      g.lineTo(b.x + o, b.y);
    }
    g.stroke();
    g.fillStyle = "rgba(20,14,8,0.55)";
    for (const [hx, hy] of holes) {
      g.beginPath();
      g.arc(b.x + hx, b.y + hy, b.r * 0.1, 0, Math.PI * 2);
      g.fill();
    }
  }

  // woven label inside the back neck
  if (spec.label) {
    const [lx, ly, lw, lh] = spec.label;
    const [x, y] = geo.moved(lx + lw / 2, ly + lh / 2).map((v, i) => v - (i ? lh : lw) / 2);
    g.fillStyle = "#ece3d0";
    g.fillRect(x, y, lw, lh);
    const shade = g.createLinearGradient(0, y, 0, y + lh);
    shade.addColorStop(0, "rgba(40,30,20,0.35)");
    shade.addColorStop(0.3, "rgba(40,30,20,0)");
    g.fillStyle = shade;
    g.fillRect(x, y, lw, lh);
    g.fillStyle = "rgba(40,32,24,0.75)";
    g.fillRect(x + lw * 0.22, y + lh * 0.42, lw * 0.56, lh * 0.16);
    g.fillRect(x + lw * 0.32, y + lh * 0.68, lw * 0.36, lh * 0.08);
  }

  if (req.hanger && req.kind === "trouser") drawClipHanger(g);
  return out.c.transferToImageBitmap();
}

/* --- hangers --------------------------------------------------------------- */

function hook(g: OffscreenCanvasRenderingContext2D, from: number) {
  const steel = g.createLinearGradient(94, 0, 118, 0);
  steel.addColorStop(0, "#77797d");
  steel.addColorStop(0.45, "#eceef0");
  steel.addColorStop(1, "#6f7175");
  g.strokeStyle = steel;
  g.lineWidth = 1.5;
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(100, from);
  g.lineTo(100, -6);
  g.quadraticCurveTo(100, -14, 106, -18);
  g.quadraticCurveTo(116, -25, 111, -35);
  g.quadraticCurveTo(105, -44, 96, -38);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 0.35;
  g.beginPath();
  g.moveTo(99.6, from - 1);
  g.lineTo(99.6, -6);
  g.stroke();
}

function drawHanger(g: OffscreenCanvasRenderingContext2D) {
  hook(g, 16);
  const bar = new Path2D("M36 38 Q100 8 164 38");
  g.lineCap = "round";
  g.strokeStyle = "#7d5a35";
  g.lineWidth = 4.6;
  g.stroke(bar);
  g.save();
  g.translate(0, -0.45);
  g.strokeStyle = "#b48a57";
  g.lineWidth = 3.4;
  g.stroke(bar);
  g.translate(0, -0.7);
  g.strokeStyle = "rgba(236,208,160,0.7)";
  g.lineWidth = 1;
  g.stroke(bar);
  g.restore();
}

function drawClipHanger(g: OffscreenCanvasRenderingContext2D) {
  hook(g, 4);
  const steel = g.createLinearGradient(0, 2, 0, 7);
  steel.addColorStop(0, "#eceef0");
  steel.addColorStop(1, "#7a7c80");
  g.fillStyle = steel;
  g.beginPath();
  g.roundRect(48, 2.2, 104, 4.4, 2.2);
  g.fill();
  for (const x of [58, 136]) {
    g.save();
    g.shadowColor = "rgba(20,14,8,0.35)";
    g.shadowBlur = 1.2;
    g.shadowOffsetY = 0.6;
    const clip = g.createLinearGradient(x, 0, x + 7, 0);
    clip.addColorStop(0, "#2f3033");
    clip.addColorStop(0.45, "#55575b");
    clip.addColorStop(1, "#2a2b2e");
    g.fillStyle = clip;
    g.beginPath();
    g.roundRect(x, 5, 7, 16, 1.4);
    g.fill();
    g.restore();
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(x + 1.2, 6.5, 1, 12);
  }
}
