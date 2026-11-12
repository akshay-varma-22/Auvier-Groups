import Lenis from "lenis";

let lenis: Lenis | null = null;

/** Smooth scrolling is a progressive enhancement: skipped for reduced motion. */
export function startSmoothScroll() {
  if (lenis || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 1 });
}

export function stopSmoothScroll() {
  lenis?.destroy();
  lenis = null;
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export function scrollToTarget(target: string | HTMLElement | number, offset = 0) {
  if (lenis) {
    // force: a menu may still hold the scroll lock for the frame this runs in.
    lenis.scrollTo(target, { offset, duration: 1.4, force: true });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: "smooth" });
}
