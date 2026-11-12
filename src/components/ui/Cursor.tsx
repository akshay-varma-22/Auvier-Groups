import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FINE_POINTER, useMedia } from "../../lib/useMedia";

type Mode = "default" | "hover" | "view" | "grab" | "text" | "hidden";

const INTERACTIVE = "[data-cursor], a, button, summary, label, [role='tab']";
const DARK = { c: "rgb(28 26 23)", h: "rgb(250 247 240 / 0.9)" };

/**
 * Reads any CSS colour (oklch, color-mix, rgb…) as sRGB by painting one
 * pixel, then picks a halo of the opposite lightness so the cursor
 * separates from whatever is behind it.
 */
function makeInk() {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const cache = new Map<string, { c: string; h: string }>();
  return (color: string) => {
    const hit = cache.get(color);
    if (hit) return hit;
    if (!ctx) return DARK;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a < 40) return DARK;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const ink = {
      c: `rgb(${r} ${g} ${b})`,
      h: lum > 0.55 ? "rgb(20 18 16 / 0.55)" : "rgb(250 247 240 / 0.9)",
    };
    cache.set(color, ink);
    return ink;
  };
}

/**
 * A dot that tracks the pointer exactly and a ring that follows on a spring.
 * Both take the text colour of whatever they're over (so they're dark on
 * light sections and light on dark ones) plus a halo of the opposite tone,
 * which keeps them visible over photos and the 3D scene too.
 * Elements opt into richer states with data-cursor.
 */
export function Cursor() {
  const fine = useMedia(FINE_POINTER);
  const el = useRef<HTMLDivElement>(null);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const rx = useSpring(x, { stiffness: 520, damping: 40, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 520, damping: 40, mass: 0.5 });
  const [mode, setMode] = useState<Mode>("hidden");
  const [label, setLabel] = useState("View");
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!fine) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const inkFor = makeInk();
    let shown = false;

    const paint = (target: Element | null) => {
      const node = el.current;
      if (!node || !target) return;
      const { c, h } = inkFor(getComputedStyle(target).color);
      node.style.setProperty("--cursor-c", c);
      node.style.setProperty("--cursor-h", h);
    };

    const classify = (target: Element | null) => {
      if (target?.closest("input, textarea, select")) return setMode("text");
      const hit = target?.closest<HTMLElement>(INTERACTIVE);
      if (!hit) return setMode("default");
      if (hit.dataset.cursor === "view") {
        setLabel(hit.dataset.cursorLabel ?? "View");
        return setMode("view");
      }
      if (hit.dataset.cursor === "grab" && !target?.closest("button, a")) {
        setLabel(hit.dataset.cursorLabel ?? "Drag");
        return setMode("grab");
      }
      setMode("hover");
    };

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!shown) {
        // first move (or back from outside the window): start where the pointer is
        shown = true;
        rx.jump(e.clientX);
        ry.jump(e.clientY);
        const target = e.target as Element | null;
        paint(target);
        classify(target);
      }
    };

    const over = (e: PointerEvent) => {
      const target = e.target as Element | null;
      paint(target);
      classify(target);
    };

    const leave = () => {
      shown = false;
      setMode("hidden");
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over);
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      root.removeEventListener("pointerleave", leave);
    };
  }, [fine, x, y, rx, ry]);

  if (!fine) return null;

  return (
    <div ref={el} className="cursor" data-mode={mode} data-pressed={pressed || undefined} aria-hidden="true">
      <motion.div className="cursor__anchor" style={{ x: rx, y: ry }}>
        <div className="cursor__ring">
          <span className="cursor__label">{label}</span>
        </div>
      </motion.div>
      <motion.div className="cursor__anchor" style={{ x, y }}>
        <div className="cursor__dot" />
      </motion.div>
    </div>
  );
}
