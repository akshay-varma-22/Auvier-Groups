import { motion } from "motion/react";
import { useEffect } from "react";
import { Mark } from "../components/ui/Logo";
import { EASE_IN_OUT, EASE_OUT } from "../lib/intro";

/** Opening moment: a woven label is stitched on, then lifts away. */
export function StitchIntro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2100);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="cl-intro"
      role="status"
      aria-label="Loading Auvier Clothing"
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
      transition={{ duration: 1, ease: EASE_IN_OUT }}
    >
      <motion.div
        className="cl-intro__label"
        initial={{ opacity: 0, y: 24, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        exit={{ y: -60, opacity: 0, transition: { duration: 0.6, ease: EASE_IN_OUT } }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      >
        <svg className="cl-intro__stitch" viewBox="0 0 320 140" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="cl-intro-sew">
              <motion.rect
                x="11"
                y="11"
                width="298"
                height="118"
                rx="3"
                fill="none"
                stroke="#fff"
                strokeWidth="6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.3, ease: "easeInOut", delay: 0.25 }}
              />
            </mask>
          </defs>
          <rect x="11" y="11" width="298" height="118" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="6 5" mask="url(#cl-intro-sew)" />
        </svg>
        <motion.div
          className="cl-intro__content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <Mark size={34} dot="button" />
          <span className="cl-intro__word">Auvier</span>
          <span className="cl-intro__sub">Clothing · Collection 01</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
