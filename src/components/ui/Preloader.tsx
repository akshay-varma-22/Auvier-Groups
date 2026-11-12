import { animate, motion } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_IN_OUT, EASE_OUT } from "../../lib/intro";

const WORD = "Auvier".split("");

export function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controls = animate(0, 100, {
      duration: 1.6,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (v) => setCount(Math.round(v)),
      onComplete: () => window.setTimeout(onDone, 220),
    });
    return () => controls.stop();
  }, [onDone]);

  return (
    <motion.div
      className="preloader"
      role="status"
      aria-label="Loading Auvier Technologies"
      exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
      initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 0.95, ease: EASE_IN_OUT }}
    >
      <div className="preloader__center">
        <svg className="preloader__mark" viewBox="0 0 64 64" aria-hidden="true">
          <motion.path
            d="M14 51 L32 12 L50 51"
            fill="none"
            stroke="currentColor"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE_OUT }}
          />
          <motion.circle
            cx="32"
            cy="38.5"
            r="5.25"
            fill="var(--ember)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 14 }}
          />
        </svg>
        <p className="preloader__word" aria-hidden="true">
          {WORD.map((ch, i) => (
            <span key={i} className="preloader__mask">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.25 + i * 0.05 }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
        </p>
      </div>
      <div className="preloader__foot" aria-hidden="true">
        <span>Design · Develop · Deploy</span>
        <span className="preloader__count">{String(count).padStart(3, "0")}</span>
      </div>
      <div className="preloader__bar" style={{ transform: `scaleX(${count / 100})` }} />
    </motion.div>
  );
}
