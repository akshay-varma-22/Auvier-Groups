/* Small, dependency-free helpers for drawing fabric: noise, blurs and
   polyline maths. No DOM access, so they also run inside a Web Worker. */

export type P = [number, number];

/* --- noise -------------------------------------------------------------- */

export function hash2(x: number, y: number, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise in 0–1. */
export function vnoise(x: number, y: number, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal value noise in 0–1. */
export function fbm(x: number, y: number, octaves = 3, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, y * f, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

/** A Gaussian-ish soft ridge: 1 on the line, falling off over w. */
export const ridge = (d: number, w: number) => Math.exp(-(d * d) / (w * w));

/* --- buffers ------------------------------------------------------------ */

/** Separable box blur (two passes ≈ Gaussian), clamped at the edges. */
export function blur(src: Float32Array, w: number, h: number, r: number, passes = 2) {
  if (r < 1) return src.slice();
  const a = src.slice();
  const b = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / n;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / n;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/** Bilinear sample of a w×h buffer at fractional pixel coords. */
export function sample(buf: Float32Array, w: number, h: number, x: number, y: number) {
  const fx = Math.min(w - 1.001, Math.max(0, x));
  const fy = Math.min(h - 1.001, Math.max(0, y));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const i = y0 * w + x0;
  const top = buf[i] + (buf[i + 1] - buf[i]) * tx;
  const bot = buf[i + w] + (buf[i + w + 1] - buf[i + w]) * tx;
  return top + (bot - top) * ty;
}

/** A tiling, streaky grain (knit wales or twill), values around 0–1. */
export function grainTile(size: number, rx: number, ry: number, seed: number) {
  const t = new Float32Array(size * size);
  for (let i = 0; i < t.length; i++) t[i] = hash2(i % size, Math.floor(i / size), seed);
  // wrap-around blur keeps the tile seamless
  const out = new Float32Array(t.length);
  const tmp = new Float32Array(t.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -rx; k <= rx; k++) acc += t[y * size + ((x + k + size) % size)];
      tmp[y * size + x] = acc / (2 * rx + 1);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let k = -ry; k <= ry; k++) acc += tmp[((y + k + size) % size) * size + x];
      out[y * size + x] = acc / (2 * ry + 1);
    }
  }
  // stretch the contrast back up after blurring
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of out) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo || 1);
  return out;
}

/* --- polylines ---------------------------------------------------------- */

export function quad(a: P, c: P, b: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

export function line(a: P, b: P, n: number): P[] {
  const out: P[] = [];
  for (let i = 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return out;
}

/** Concatenate polyline parts that share end points. */
export const join = (...parts: P[][]) => parts.flatMap((p, i) => (i ? p.slice(1) : p));

export const mirrorX = (pts: P[]): P[] => pts.map(([x, y]) => [-x, y] as P);

export function pointInPoly(x: number, y: number, poly: P[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Nearest point on a polyline: [x, y, distance, arc length along it]. */
export function nearest(x: number, y: number, pts: P[], closed = false): [number, number, number, number] {
  let best: [number, number, number, number] = [pts[0][0], pts[0][1], Infinity, 0];
  let run = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy || 1e-12;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2));
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(x - px, y - py);
    const seg = Math.sqrt(len2);
    if (d < best[2]) best = [px, py, d, run + seg * t];
    run += seg;
  }
  return best;
}

export function polyLength(pts: P[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

/** Point and unit tangent at arc length s along a polyline. */
export function pointAt(pts: P[], s: number): [number, number, number, number] {
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    if (run + seg >= s || i === pts.length - 1) {
      const t = seg ? Math.min(1, Math.max(0, (s - run) / seg)) : 0;
      return [ax + (bx - ax) * t, ay + (by - ay) * t, (bx - ax) / (seg || 1), (by - ay) / (seg || 1)];
    }
    run += seg;
  }
  const [x, y] = pts[pts.length - 1];
  return [x, y, 1, 0];
}

/** Offset a polyline sideways by d (positive = left of the direction of travel). */
export function offset(pts: P[], d: number): P[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    return [p[0] - (ty / len) * d, p[1] + (tx / len) * d] as P;
  });
}

/** Keep the part of a polyline between arc lengths a and b. */
export function trim(pts: P[], a: number, b: number): P[] {
  const len = polyLength(pts);
  const out: P[] = [];
  const steps = Math.max(2, Math.ceil(((b - a) / len) * pts.length * 2));
  for (let i = 0; i <= steps; i++) {
    const [x, y] = pointAt(pts, a + ((b - a) * i) / steps);
    out.push([x, y]);
  }
  return out;
}
