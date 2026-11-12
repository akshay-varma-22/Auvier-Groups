import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useRef, useState } from "react";
import { process } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 62%", "end 62%"] });
  const rail = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 });
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.max(0, Math.min(process.length - 1, Math.floor(v * process.length))));
  });

  return (
    <section id="process" className="section process" aria-labelledby="process-title">
      <div className="container process__grid">
        <div className="process__aside">
          <Eyebrow index="04">Process</Eyebrow>
          <SplitText as="h2" id="process-title" className="process__title" text="A clear path from *idea* to *live.*" />
          <div className="process__counter" aria-hidden="true">
            <span className="process__digit">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={active}
                  initial={{ y: "100%" }}
                  animate={{ y: "0%" }}
                  exit={{ y: "-100%" }}
                  transition={{ duration: 0.6, ease: EASE_OUT }}
                >
                  0{active + 1}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="process__of">/ 0{process.length}</span>
          </div>
          <p className="process__now" aria-live="polite">
            <span className="process__now-dot" />
            {process[active].title} <span>· {process[active].when}</span>
          </p>
        </div>

        <div ref={ref} className="process__steps">
          <div className="process__rail" aria-hidden="true">
            <motion.span style={{ scaleY: rail }} />
          </div>
          <ol>
            {process.map((s, i) => (
              <li key={s.title} className={i <= active ? "step is-on" : "step"}>
                <span className="step__dot" aria-hidden="true" />
                <div className="step__head">
                  <span className="step__num">Step 0{i + 1}</span>
                  <span className="step__when">{s.when}</span>
                </div>
                <h3 className="step__title">{s.title}</h3>
                <p className="step__body">{s.body}</p>
                <ul className="step__points">
                  {s.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
