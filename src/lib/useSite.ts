import { useEffect } from "react";
import { scrollToTarget, startSmoothScroll } from "./scroll";

/** Smooth scrolling plus in-page anchor links routed through it. Used by every page. */
export function useSmoothSite() {
  useEffect(() => {
    startSmoothScroll();

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.classList.contains("skip-link")) return;
      const hash = link.getAttribute("href")!;
      const target = hash === "#top" ? 0 : document.querySelector<HTMLElement>(hash);
      if (target === null) return;
      e.preventDefault();
      // Wait two frames so any menu that closed on this click has released its scroll lock.
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToTarget(target)));
      history.replaceState(null, "", hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
}
