import * as THREE from "three";
import { nearest, pointAt, pointInPoly, polyLength, sample, type P } from "../fabric/field";
import type { Ctx2D } from "../fabric/mark";
import {
  BH,
  BODY,
  BOUNDS,
  BW,
  FOLDS,
  GEO,
  SLEEVE_L,
  SLEEVE_R,
  STITCHES,
  STITCH_TOTAL,
  generateTeeMaps,
  wrinkle,
  type TeeData,
} from "./teePattern";

export { AMP_FLAT, AMP_PRESSED, FOLDED } from "./teePattern";

/* A soft, sewn tee.

   Each pattern piece (body, two sleeves) is a dense mesh lifted by a height
   field: gentle wrinkles, a raised rib neckband, turned-up hems, seams and the
   inside of the back neck seen through the neckline. Folds are rounded,
   cylindrical bends applied one after another, so a folded tee has soft,
   layered edges like the real thing. Stitching is tone-on-tone and is
   "sewn in" by a shader as the story plays. The pattern and textures live in
   teePattern.ts; the textures are made in a worker so the page never stalls. */

export type TeeTextures = {
  map: THREE.Texture;
  normal: THREE.Texture;
  stitch: THREE.Texture;
  struct: { buf: Float32Array; w: number; h: number; ppu: number };
};

function toTextures(d: TeeData): TeeTextures {
  const make = (px: Uint8ClampedArray, srgb: boolean) => {
    const t = new THREE.DataTexture(new Uint8Array(px.buffer, px.byteOffset, px.byteLength), d.w, d.h, THREE.RGBAFormat);
    // rows arrive top-to-bottom, like a canvas
    t.flipY = true;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return {
    map: make(d.map, true),
    normal: make(d.normal, false),
    stitch: make(d.stitch, false),
    struct: { buf: d.struct, w: d.sw, h: d.sh, ppu: d.ppu },
  };
}

const ctx2d = (w: number, h: number): Ctx2D => {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true })!;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true })!;
};

/** Makes the tee's textures in a worker (on the main thread only if workers can't). */
export function loadTeeTextures(coarse: boolean): Promise<TeeTextures> {
  return new Promise((resolve) => {
    const local = () => resolve(toTextures(generateTeeMaps(coarse, ctx2d)));
    let worker: Worker;
    try {
      worker = new Worker(new URL("./tee.worker.ts", import.meta.url), { type: "module" });
    } catch {
      local();
      return;
    }
    worker.onmessage = (e: MessageEvent<TeeData | { error: string }>) => {
      worker.terminate();
      if ("map" in e.data) resolve(toTextures(e.data));
      else local();
    };
    worker.onerror = () => {
      worker.terminate();
      local();
    };
    worker.postMessage({ coarse });
  });
}

/* --- material ------------------------------------------------------------ */

function teeMaterial(color: string, tex: TeeTextures) {
  const uniforms = { uStitch: { value: tex.stitch }, uSew: { value: 1 } };
  const base = new THREE.Color(color);
  const mat = new THREE.MeshStandardMaterial({
    color: base.clone().multiplyScalar(1.15),
    map: tex.map,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.88,
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

/** A piece's grid, clean edge and relief: identical for every tee, so it's made once. */
type Template = { px: Float32Array; py: Float32Array; hs: Float32Array; uv: THREE.BufferAttribute; index: THREE.BufferAttribute };
const templates = new Map<string, Template>();

function template(name: string, outline: P[], tex: TeeTextures, step: number): Template {
  const key = `${name}|${step}|${tex.struct.w}`;
  const hit = templates.get(key);
  if (hit) return hit;
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
  const uv = new Float32Array(n * 2);
  const { buf, w, h, ppu } = tex.struct;
  for (let i = 0; i < n; i++) {
    uv[i * 2] = (px[i] - BOUNDS.x0) / BW;
    uv[i * 2 + 1] = (py[i] - BOUNDS.y0) / BH;
    hs[i] = sample(buf, w, h, (px[i] - BOUNDS.x0) * ppu - 0.5, (BOUNDS.y1 - py[i]) * ppu - 0.5) * GEO;
  }
  const t: Template = {
    px,
    py,
    hs,
    uv: new THREE.BufferAttribute(uv, 2),
    index: new THREE.BufferAttribute(n > 65535 ? Uint32Array.from(index) : Uint16Array.from(index), 1),
  };
  templates.set(key, t);
  return t;
}

function buildPiece(name: string, outline: P[], tex: TeeTextures, step: number, side: -1 | 0 | 1, seed: number): Piece {
  const t = template(name, outline, tex, step);
  const n = t.px.length;
  const wr = new Float32Array(n);
  for (let i = 0; i < n; i++) wr[i] = wrinkle(t.px[i], t.py[i], seed);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("uv", t.uv);
  geo.setIndex(t.index);
  return { geo, px: t.px, py: t.py, hs: t.hs, wr, side };
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
      buildPiece("body", BODY, tex, step, 0, seed),
      buildPiece("sleeveL", SLEEVE_L, tex, step, -1, seed),
      buildPiece("sleeveR", SLEEVE_R, tex, step, 1, seed),
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
