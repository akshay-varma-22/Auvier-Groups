import { World, type WorldOptions } from "./World";

/* Runs the 3D studio off the main thread. GPU driver stalls (shader compiles
   on first draw can take a second on some machines) and the studio's build
   work then never block scrolling or the rest of the page. */

type Msg =
  | { type: "init"; canvas: OffscreenCanvas; opts: WorldOptions }
  | { type: "progress"; value: number }
  | { type: "size"; width: number; height: number }
  | { type: "visible"; value: boolean }
  | { type: "pointer"; x: number; y: number };

const port = self as unknown as { postMessage(message: unknown): void };
let world: World | null = null;

self.onmessage = (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type === "init") {
    try {
      world = new World(m.canvas, m.opts, () => port.postMessage("ready"), (stats) => port.postMessage({ type: "stats", ...stats }));
    } catch {
      port.postMessage("failed");
    }
    return;
  }
  if (!world) return;
  if (m.type === "progress") world.setProgress(m.value);
  else if (m.type === "size") world.setSize(m.width, m.height);
  else if (m.type === "visible") world.setVisible(m.value);
  else world.setPointer(m.x, m.y);
};
