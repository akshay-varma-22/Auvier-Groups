import type { Kind } from "./specs";

/* Asks the photo worker for a garment image, once per garment/colour/size. */

type Reply = { id: number; blob?: Blob; error?: string };

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, (url: string | null) => void>();
const cache = new Map<string, Promise<string | null>>();

function getWorker() {
  if (worker !== undefined) return worker;
  try {
    if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined" || typeof Path2D === "undefined") {
      return (worker = null);
    }
    const w = new Worker(new URL("./photo.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<Reply>) => {
      pending.get(e.data.id)?.(e.data.blob ? URL.createObjectURL(e.data.blob) : null);
      pending.delete(e.data.id);
    };
    w.onerror = () => {
      // no worker support after all: everyone keeps the drawn flats
      pending.forEach((resolve) => resolve(null));
      pending.clear();
      worker = null;
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** Pixel scale for a garment drawn `width` CSS pixels wide (200 units across). */
export function photoScale(width: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return Math.min(5, Math.max(2, Math.ceil(((width || 240) * dpr) / 100) / 2));
}

/** An image URL for the garment photo (null if this browser can't make one). */
export function photo(kind: Kind, color: string, hanger: boolean, scale: number): Promise<string | null> {
  const key = `${kind}|${color}|${hanger}|${scale}`;
  let p = cache.get(key);
  if (!p) {
    const w = getWorker();
    p = w
      ? new Promise<string | null>((resolve) => {
          const id = ++seq;
          pending.set(id, resolve);
          w.postMessage({ id, kind, color, hanger, scale });
        })
      : Promise.resolve(null);
    cache.set(key, p);
  }
  return p;
}
