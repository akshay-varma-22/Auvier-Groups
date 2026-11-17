import { render, type PhotoRequest } from "./photo";

/* Renders garment photos off the main thread and hands back a compressed
   image, which the browser also decodes off the main thread. */

type Out = { postMessage(message: unknown): void };
const port = self as unknown as Out;

self.onmessage = async (e: MessageEvent<PhotoRequest & { id: number }>) => {
  const { id, ...req } = e.data;
  try {
    const canvas = render(req);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.92 });
    port.postMessage({ id, blob });
  } catch (err) {
    port.postMessage({ id, error: String(err) });
  }
};
