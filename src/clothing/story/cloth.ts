import * as THREE from "three";

/* Verlet cloth gathered on a rail like a curtain: pinned top row, distance
   constraints (structural, shear, bend), gravity, a weighted hem and a breeze
   that pushes along each vertex normal like air against a sail. */

export const CLOTH = {
  cols: 24,
  rows: 32,
  width: 1.56,
  height: 2.12,
  railY: 1.12,
  /** 1 = flat; lower = fuller pleats where it's gathered on the rail. */
  gather: 0.74,
};

const DT = 1 / 60;
const DAMPING = 0.985;
const GRAVITY = -9.8;
const ITERATIONS = 10;

export class Cloth {
  readonly cols = CLOTH.cols;
  readonly rows = CLOTH.rows;
  readonly n = (CLOTH.cols + 1) * (CLOTH.rows + 1);
  pos = new Float32Array(this.n * 3);
  prev = new Float32Array(this.n * 3);
  acc = new Float32Array(this.n * 3);
  pinned = new Uint8Array(this.n);
  heavy = new Float32Array(this.n);
  private a: number[] = [];
  private b: number[] = [];
  private rest: number[] = [];
  private stiff: number[] = [];

  constructor() {
    const { cols, rows, width: W, height: H, railY, gather: G } = CLOTH;
    const rx = W / cols;
    const ry = H / rows;
    const pleat = rx * Math.sqrt(1 - G * G) * 0.5;
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const g = G + (1 - G) * 0.35 * t;
      for (let c = 0; c <= cols; c++) {
        const i = r * (cols + 1) + c;
        const x = (-W / 2 + c * rx) * g;
        const y = railY - 0.035 - r * ry * 0.97;
        const z = (c % 2 ? 1 : -1) * pleat * (r === 0 ? 0.6 : 1);
        this.pos.set([x, y, z], i * 3);
        this.prev.set([x, y, z], i * 3);
        if (r === 0) this.pinned[i] = 1;
        this.heavy[i] = r >= rows - 1 ? 1.8 : 1;
      }
    }
    const link = (i: number, j: number, s: number) => {
      const ci = i % (cols + 1);
      const ri = Math.floor(i / (cols + 1));
      const cj = j % (cols + 1);
      const rj = Math.floor(j / (cols + 1));
      this.a.push(i);
      this.b.push(j);
      this.rest.push(Math.hypot((cj - ci) * rx, (rj - ri) * ry));
      this.stiff.push(s);
    };
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const i = r * (cols + 1) + c;
        if (c < cols) link(i, i + 1, 1);
        if (r < rows) link(i, i + cols + 1, 1);
        if (c < cols && r < rows) {
          link(i, i + cols + 2, 0.6);
          link(i + 1, i + cols + 1, 0.6);
        }
        if (c < cols - 1) link(i, i + 2, 0.22);
        if (r < rows - 1) link(i, i + 2 * (cols + 1), 0.22);
      }
    }
  }

  step(wind: THREE.Vector3, normals: ArrayLike<number> | null) {
    const { pos, prev, acc, pinned, heavy, n } = this;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      acc[o + 1] += GRAVITY * heavy[i];
      if (normals) {
        const d = normals[o] * wind.x + normals[o + 1] * wind.y + normals[o + 2] * wind.z;
        acc[o] += normals[o] * d;
        acc[o + 1] += normals[o + 1] * d;
        acc[o + 2] += normals[o + 2] * d;
      }
    }
    const dt2 = DT * DT;
    for (let i = 0; i < n; i++) {
      const o = i * 3;
      if (pinned[i]) {
        acc[o] = acc[o + 1] = acc[o + 2] = 0;
        continue;
      }
      for (let k = 0; k < 3; k++) {
        const p = pos[o + k];
        pos[o + k] = p + (p - prev[o + k]) * DAMPING + acc[o + k] * dt2;
        prev[o + k] = p;
        acc[o + k] = 0;
      }
    }
    const { a, b, rest, stiff } = this;
    for (let it = 0; it < ITERATIONS; it++) {
      for (let k = 0; k < a.length; k++) {
        const oa = a[k] * 3;
        const ob = b[k] * 3;
        const dx = pos[ob] - pos[oa];
        const dy = pos[ob + 1] - pos[oa + 1];
        const dz = pos[ob + 2] - pos[oa + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = ((dist - rest[k]) / dist) * stiff[k];
        const pa = pinned[a[k]];
        const pb = pinned[b[k]];
        if (pa && pb) continue;
        const wa = pa ? 0 : pb ? 1 : 0.5;
        const wb = pb ? 0 : pa ? 1 : 0.5;
        pos[oa] += dx * diff * wa;
        pos[oa + 1] += dy * diff * wa;
        pos[oa + 2] += dz * diff * wa;
        pos[ob] -= dx * diff * wb;
        pos[ob + 1] -= dy * diff * wb;
        pos[ob + 2] -= dz * diff * wb;
      }
    }
  }

  /** Push particles near a (local) point along a direction. */
  brush(point: THREE.Vector3, dir: THREE.Vector3, radius = 0.36) {
    const { pos, prev, pinned, n } = this;
    for (let i = 0; i < n; i++) {
      if (pinned[i]) continue;
      const o = i * 3;
      const d = Math.hypot(pos[o] - point.x, pos[o + 1] - point.y);
      if (d > radius) continue;
      const f = (1 - d / radius) ** 2;
      prev[o] -= dir.x * f;
      prev[o + 1] -= dir.y * f;
      prev[o + 2] -= dir.z * f;
    }
  }
}
