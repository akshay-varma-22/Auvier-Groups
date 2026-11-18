/* Scrolling uses the browser's own (native) scrolling. It runs on the
   browser's compositor thread, so it stays smooth and responds instantly even
   when the page is busy, unlike a JavaScript smooth-scroll library, which
   moves the page from the main thread every frame and adds easing lag. */

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Freeze page scrolling (menus, dialogs, the intro). */
export function lockScroll(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** Glide to an element, a selector or a scroll position. */
export function scrollToTarget(target: string | HTMLElement | number, offset = 0) {
  const behavior: ScrollBehavior = reduced() ? "auto" : "smooth";
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, behavior });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior });
}
