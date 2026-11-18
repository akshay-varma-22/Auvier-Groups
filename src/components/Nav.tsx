import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { group } from "../brand";
import { EASE_IN_OUT, EASE_OUT } from "../lib/intro";
import { lockScroll } from "../lib/scroll";
import { Button } from "./ui/Button";

export type NavLink = { label: string; href: string };

/** How far you must scroll back up (px) before the hidden bar returns. */
const REVEAL_AFTER = 160;
/** How far you must scroll down (px) before the bar tucks away. */
const HIDE_AFTER = 12;

type Props = {
  /** The logo lockup shown in the bar */
  brand: ReactNode;
  /** Accessible name for the logo link */
  brandLabel: string;
  links: NavLink[];
  cta: NavLink;
  /** Extra links shown only in the mobile menu (e.g. sister companies) */
  menuExtras?: NavLink[];
  /** "split": logo left, links centred. "centered": links left, logo centred. */
  layout?: "split" | "centered";
};

export function Nav({ brand, brandLabel, links, cta, menuExtras = [], layout = "split" }: Props) {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // where the current scroll direction began, so a small nudge up doesn't bring the bar back
  const turn = useRef({ dir: 0, from: 0 });
  const shown = useRef({ hidden: false, scrolled: false });
  const show = (hide: boolean) => {
    if (shown.current.hidden !== hide) setHidden((shown.current.hidden = hide));
  };

  useMotionValueEvent(scrollY, "change", (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (shown.current.scrolled !== v > 24) setScrolled((shown.current.scrolled = v > 24));
    const dir = Math.sign(v - prev);
    if (dir && dir !== turn.current.dir) turn.current = { dir, from: prev };
    if (v <= 480) show(false);
    else if (dir > 0 && v - turn.current.from > HIDE_AFTER) show(true);
    else if (dir < 0 && turn.current.from - v > REVEAL_AFTER) show(false);
  });

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menuLinks = [...links, cta];

  return (
    <>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <motion.header
        className={["nav", `nav--${layout}`, scrolled && "is-scrolled", open && "is-menu-open"].filter(Boolean).join(" ")}
        animate={{ y: hidden && !open ? "-130%" : "0%" }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className="nav__inner">
          <a href="#top" className="nav__logo" aria-label={`${brandLabel} — back to top`}>
            {brand}
          </a>

          <nav className="nav__links" aria-label="Primary">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="nav__link">
                <span className="roll" data-text={l.label}>
                  <span>{l.label}</span>
                </span>
              </a>
            ))}
          </nav>

          <div className="nav__cta">
            <Button href={cta.href} size="sm">
              {cta.label}
            </Button>
          </div>

          <button
            className={open ? "nav__burger is-open" : "nav__burger"}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="menu"
            initial={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
            animate={{ clipPath: "circle(150% at calc(100% - 44px) 40px)" }}
            exit={{ clipPath: "circle(0% at calc(100% - 44px) 40px)" }}
            transition={{ duration: 0.8, ease: EASE_IN_OUT }}
          >
            <nav className="menu__links" aria-label="Mobile">
              {menuLinks.map((l, i) => (
                <div key={l.href} className="menu__mask">
                  <motion.a
                    href={l.href}
                    className="menu__link"
                    onClick={() => setOpen(false)}
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "110%" }}
                    transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 + i * 0.06 }}
                  >
                    <span className="menu__index">0{i + 1}</span>
                    {l.label}
                  </motion.a>
                </div>
              ))}
            </nav>
            <motion.div
              className="menu__foot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.6 } }}
              exit={{ opacity: 0 }}
            >
              {menuExtras.length > 0 && (
                <div className="menu__extras">
                  <span className="menu__label">{group.name}</span>
                  {menuExtras.map((l) => (
                    <a key={l.href} href={l.href}>
                      {l.label} ↗
                    </a>
                  ))}
                </div>
              )}
              <span className="menu__label">Say hello</span>
              <a href={`mailto:${group.email}`}>{group.email}</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
