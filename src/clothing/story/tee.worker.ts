import { generateTeeMaps, type TeeData } from "./teePattern";

/* Makes the tee's textures off the main thread, so scrolling never stalls. */

type Out = { postMessage(message: unknown, transfer?: Transferable[]): void };
const port = self as unknown as Out;

self.onmessage = (e: MessageEvent<{ coarse: boolean }>) => {
  try {
    if (typeof OffscreenCanvas === "undefined") throw new Error("no OffscreenCanvas");
    const d: TeeData = generateTeeMaps(e.data.coarse, (w, h) => new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true })!);
    port.postMessage(d, [d.map.buffer, d.normal.buffer, d.stitch.buffer, d.struct.buffer]);
  } catch (err) {
    port.postMessage({ error: String(err) });
  }
};
