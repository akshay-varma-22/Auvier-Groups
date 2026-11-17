import monoUrl from "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url";
import serifUrl from "@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url";
import type { Ctx2D } from "../fabric/mark";

/* The 3D studio runs either on the page or inside a Web Worker (with an
   OffscreenCanvas), so it never touches the DOM directly: these helpers work
   in both places. */

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export const inWorker = typeof document === "undefined";

/** A 2D canvas that works on the page and in a worker. */
export function makeCanvas(w: number, h: number): AnyCanvas {
  if (inWorker) return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export const ctx2d = (c: AnyCanvas) => c.getContext("2d") as Ctx2D;

/** Next animation frame (falls back to a 60 Hz timer where workers lack rAF). */
export function nextFrame(cb: (now: number) => void): number {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(cb);
  return setTimeout(() => cb(performance.now()), 16) as unknown as number;
}

export function cancelFrame(id: number) {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(id);
  clearTimeout(id);
}

/** Wait for a quiet moment (no idle callbacks in workers: a short timer instead). */
export function idle() {
  return new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => resolve(), { timeout: 160 });
    else setTimeout(resolve, inWorker ? 4 : 24);
  });
}

/**
 * Resolves once the label fonts can be drawn. On the page they're already
 * loading through CSS; a worker loads its own copies of the same files.
 */
export function fontsReady(): Promise<void> {
  if (!inWorker) return document.fonts.ready.then(() => undefined);
  const set = (self as unknown as { fonts?: FontFaceSet }).fonts;
  if (!set || typeof FontFace === "undefined") return Promise.resolve();
  const faces = [new FontFace("Instrument Serif", `url(${serifUrl})`), new FontFace("Geist Mono Variable", `url(${monoUrl})`, { weight: "100 900" })];
  return Promise.all(
    faces.map((f) =>
      f
        .load()
        .then((loaded) => {
          set.add(loaded);
        })
        .catch(() => undefined),
    ),
  ).then(() => undefined);
}
