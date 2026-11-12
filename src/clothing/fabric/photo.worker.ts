import { render, type PhotoRequest } from "./photo";

/* Renders garment photos off the main thread so scrolling stays smooth. */

type Out = { postMessage(message: unknown, transfer?: Transferable[]): void };
const port = self as unknown as Out;

self.onmessage = (e: MessageEvent<PhotoRequest & { id: number }>) => {
  const { id, ...req } = e.data;
  try {
    const bitmap = render(req);
    port.postMessage({ id, bitmap }, [bitmap]);
  } catch (err) {
    port.postMessage({ id, error: String(err) });
  }
};
