import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { EASE_IN_OUT, EASE_OUT } from "../../lib/intro";

/* A miniature browser that shows one site moving through the studio's three
   stages: wireframe → code → live. Everything is sized in em against a
   container-query font size, so it scales perfectly at any width. */

const URLS = ["wireframe · v0.3", "localhost:5173", "yourbrand.com"];

export function BuildPreview({ stage }: { stage: number }) {
  return (
    <div className="bp">
      <div className="bp__bar">
        <span className="bp__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="bp__url">
          {stage === 2 ? (
            <svg viewBox="0 0 16 16" className="bp__lock" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="1.6" fill="currentColor" />
              <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          ) : (
            <span className="bp__pending" aria-hidden="true" />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={stage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {URLS[stage]}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className={stage === 2 ? "bp__status is-live" : "bp__status"}>{stage === 2 ? "Live" : "Draft"}</span>
      </div>

      <div className="bp__screen">
        <AnimatePresence initial={false}>
          <motion.div
            key={stage}
            className="bp__stage"
            initial={{ clipPath: "inset(0% 100% 0% 0%)", zIndex: 2 }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)", zIndex: 2 }}
            exit={{ zIndex: 1, opacity: 0, transition: { delay: 0.7, duration: 0.2 } }}
            transition={{ duration: 0.85, ease: EASE_IN_OUT }}
          >
            {stage === 0 && <Wireframe />}
            {stage === 1 && <Code />}
            {stage === 2 && <Live />}
          </motion.div>
        </AnimatePresence>
        <motion.span
          key={`scan-${stage}`}
          className="bp__scan"
          aria-hidden="true"
          initial={{ left: "0%", opacity: 1 }}
          animate={{ left: "100%", opacity: [1, 1, 0] }}
          transition={{ duration: 0.85, ease: EASE_IN_OUT }}
        />
      </div>
    </div>
  );
}

function Wireframe() {
  return (
    <div className="wf">
      <div className="wf__nav">
        <span className="wf__box wf__logo" />
        <span className="wf__links">
          <i />
          <i />
          <i />
        </span>
        <span className="wf__box wf__btn" />
      </div>
      <div className="wf__hero">
        <div className="wf__copy">
          <span className="wf__tag">H1 · 72/68</span>
          <span className="wf__bar" style={{ width: "92%" }} />
          <span className="wf__bar" style={{ width: "64%" }} />
          <span className="wf__line" style={{ width: "88%" }} />
          <span className="wf__line" style={{ width: "70%" }} />
          <span className="wf__cta">Primary CTA</span>
        </div>
        <div className="wf__img">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 L100 100 M100 0 L0 100" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="wf__tag wf__tag--img">Hero image</span>
        </div>
      </div>
      <div className="wf__grid">
        <span className="wf__box" />
        <span className="wf__box" />
        <span className="wf__box" />
      </div>
      <span className="wf__guide wf__guide--x">
        <span>1440</span>
      </span>
      <span className="wf__guide wf__guide--gap">24</span>
      <motion.div
        className="wf__cursor"
        initial={{ left: "70%", top: "70%" }}
        animate={{ left: ["70%", "22%", "58%", "40%"], top: ["70%", "60%", "34%", "48%"] }}
        transition={{ duration: 3.4, ease: "easeInOut", times: [0, 0.35, 0.7, 1] }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 3l7 18 2.5-7.5L21 11z" fill="var(--ember)" stroke="var(--ink-0)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span>Auvier</span>
      </motion.div>
    </div>
  );
}

type Tok = [cls: string, text: string];

const CODE: Tok[][] = [
  [["k", "export function "], ["f", "Hero"], ["p", "() {"]],
  [["k", "  return "], ["p", "("]],
  [["p", "    <"], ["t", "section "], ["a", "className"], ["p", "="], ["s", '"hero"'], ["p", ">"]],
  [["p", "      <"], ["t", "h1"], ["p", ">"], ["x", "Grow "], ["p", "<"], ["t", "em"], ["p", ">"], ["x", "faster."], ["p", "</"], ["t", "em"], ["p", "></"], ["t", "h1"], ["p", ">"]],
  [["p", "      <"], ["t", "Button "], ["a", "href"], ["p", "="], ["s", '"/start"'], ["p", ">"]],
  [["x", "        Get started"]],
  [["p", "      </"], ["t", "Button"], ["p", ">"]],
  [["p", "    </"], ["t", "section"], ["p", ">"]],
  [["p", "  );"]],
  [["p", "}"]],
];

function Code() {
  return (
    <div className="code">
      <div className="code__tabs">
        <span className="is-active">Hero.tsx</span>
        <span>tokens.css</span>
        <span>deploy.yml</span>
      </div>
      <pre className="code__body">
        {CODE.map((line, i) => (
          <motion.span
            key={i}
            className="code__line"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.35, ease: EASE_OUT }}
          >
            <span className="code__ln">{i + 1}</span>
            {line.map(([cls, text], j) => (
              <span key={j} className={`tk-${cls}`}>
                {text}
              </span>
            ))}
            {i === CODE.length - 1 && <span className="code__caret" />}
          </motion.span>
        ))}
      </pre>
      <motion.div
        className="code__preview"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.1, duration: 0.6, ease: EASE_OUT }}
      >
        <span className="code__preview-label">Preview · hot reload</span>
        <span className="code__preview-title">
          Grow <em>faster.</em>
        </span>
        <span className="code__preview-btn">Get started</span>
      </motion.div>
    </div>
  );
}

function Live() {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLive(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="live">
      <div className="live__nav">
        <span className="live__brand">
          <i />
          yourbrand
        </span>
        <span className="live__links">
          <span>Product</span>
          <span>Pricing</span>
          <span>About</span>
        </span>
        <span className="live__pill">Sign in</span>
      </div>
      <div className="live__hero">
        <div className="live__copy">
          <span className="live__kicker">New · Spring collection</span>
          <span className="live__title">
            Grow <em>faster.</em>
          </span>
          <span className="live__text">A website your customers actually enjoy using — and come back to.</span>
          <span className="live__cta">Get started →</span>
        </div>
        <div className="live__art" aria-hidden="true">
          <motion.span
            className="live__orb"
            animate={{ rotate: 360 }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity }}
          />
          <span className="live__ring" />
          <span className="live__ring live__ring--2" />
        </div>
      </div>
      <div className="live__logos" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <motion.div
        className={live ? "live__toast is-live" : "live__toast"}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
      >
        <span className="live__toast-dot" />
        <span className="live__toast-text">{live ? "Deployed · live worldwide" : "Building production…"}</span>
        <span className="live__toast-bar">
          <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.5, duration: 1, ease: "easeInOut" }} />
        </span>
      </motion.div>
    </div>
  );
}
