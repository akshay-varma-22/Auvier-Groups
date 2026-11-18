import { motion, useInView, useMotionValue, useSpring, useTransform, type Variants } from "motion/react";
import { useRef, useState, type PointerEvent } from "react";
import { hero } from "../../content";
import { EASE_OUT, useIntroReady } from "../../lib/intro";
import { REDUCED_MOTION, useMedia } from "../../lib/useMedia";
import { Button } from "../ui/Button";
import { BuildPreview } from "./BuildPreview";
import { ShaderCanvas } from "./ShaderCanvas";

const line: Variants = {
  hidden: { y: "105%" },
  show: (i: number) => ({ y: "0%", transition: { duration: 1.2, ease: EASE_OUT, delay: 0.1 + i * 0.1 } }),
};

const fade: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (d: number) => ({ opacity: 1, y: 0, transition: { duration: 1, ease: EASE_OUT, delay: d } }),
};

export function Hero() {
  const ready = useIntroReady();
  const reduced = useMedia(REDUCED_MOTION);
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  // the preview only cycles while the hero is on screen (no re-renders while you read further down)
  const inView = useInView(sectionRef);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), { stiffness: 120, damping: 20 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 });

  const select = (i: number) => {
    setStage(i);
    setCycle((c) => c + 1);
  };
  const next = () => select((stage + 1) % hero.stages.length);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || !sectionRef.current) return;
    const r = sectionRef.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const state = ready ? "show" : "hidden";
  const autoplay = !reduced && ready && !paused && inView;

  return (
    <section ref={sectionRef} id="top" className="hero" onPointerMove={onPointerMove} aria-labelledby="hero-title">
      <ShaderCanvas className="hero__shader" />
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__grid container">
        <motion.div className="hero__copy" initial="hidden" animate={state}>
          <motion.p className="eyebrow hero__eyebrow" variants={fade} custom={0.1}>
            <span className="eyebrow__index">Auvier Technologies</span>
            <span>{hero.eyebrow}</span>
          </motion.p>

          <h1 id="hero-title" className="hero__title">
            <span className="sr-only">Design. Develop. Deploy.</span>
            {hero.stages.map((s, i) => (
              <span
                key={s.word}
                className={stage === i ? "hero__line is-active" : "hero__line"}
                aria-hidden="true"
                onPointerEnter={(e) => e.pointerType === "mouse" && select(i)}
              >
                <motion.span className="hero__line-inner" variants={line} custom={i}>
                  <span className="hero__word">{s.word}</span>
                  <span className="hero__dot">.</span>
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p className="hero__lede" variants={fade} custom={0.55}>
            {hero.lede}
          </motion.p>

          <motion.div className="hero__actions" variants={fade} custom={0.68}>
            <Button href="#contact">Start a project</Button>
            <Button href="#work" variant="ghost" icon="down">
              See our work
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__visual"
          initial={{ opacity: 0, y: 60, scale: 0.94 }}
          animate={ready ? { opacity: 1, y: 0, scale: 1 } : undefined}
          transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.45 }}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          <motion.div className="hero__tilt" style={{ rotateX, rotateY }}>
            <div id="hero-stage" role="tabpanel" aria-label={`${hero.stages[stage].word} stage preview`}>
              <BuildPreview stage={stage} />
            </div>
            <span className="hero__glow" aria-hidden="true" />
          </motion.div>

          <div className={autoplay ? "hero__tabs" : "hero__tabs is-paused"} role="tablist" aria-label="Studio process">
            {hero.stages.map((s, i) => (
              <button
                key={s.word}
                role="tab"
                aria-selected={stage === i}
                aria-controls="hero-stage"
                className={stage === i ? "hero__tab is-active" : "hero__tab"}
                onClick={() => select(i)}
              >
                <span className="hero__tab-label">
                  <span className="hero__tab-index">0{i + 1}</span>
                  {s.word}
                </span>
                <span className="hero__tab-note">{s.note}</span>
                <span className="hero__tab-track">
                  <span
                    key={stage === i ? `run-${cycle}` : "idle"}
                    className={stage === i ? "hero__tab-fill is-running" : i < stage ? "hero__tab-fill is-done" : "hero__tab-fill"}
                    onAnimationEnd={stage === i ? next : undefined}
                  />
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="hero__foot container"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ delay: 1.1, duration: 1 }}
      >
        <span className="status-pill">
          <span className="status-pill__dot" />
          {hero.availability}
        </span>
        <a href="#intro" className="hero__scroll">
          <span>Scroll</span>
          <span className="hero__scroll-line" aria-hidden="true" />
        </a>
      </motion.div>
    </section>
  );
}
