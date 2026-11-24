import { motion } from "motion/react";
import type { PointerEvent } from "react";
import { principles } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

type Visual = (typeof principles)[number]["visual"];

function Art({ kind }: { kind: Visual }) {
  switch (kind) {
    case "custom":
      return (
        <div className="art art--custom" aria-hidden="true">
          <i className="s1" />
          <i className="s2" />
          <i className="s3" />
        </div>
      );
    case "fast":
      return (
        <div className="art art--fast" aria-hidden="true">
          <span className="art__row">
            <span className="art__k">Page-builder template</span>
            <span className="art__bar">
              <i style={{ width: "88%" }} />
            </span>
          </span>
          <span className="art__row is-us">
            <span className="art__k">Hand-built by Auvier</span>
            <span className="art__bar">
              <i style={{ width: "26%" }} />
            </span>
          </span>
        </div>
      );
    case "access":
      return (
        <div className="art art--access" aria-hidden="true">
          <span className="art__aa">Aa</span>
          <span className="art__badge">AA</span>
          <span className="art__focus">Tab ↹</span>
        </div>
      );
    case "own":
      return (
        <div className="art art--own" aria-hidden="true">
          <svg viewBox="0 0 120 60">
            <circle cx="30" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="6" />
            <path d="M46 30h62M92 30v14M104 30v10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <span className="art__code">&lt;/&gt;</span>
        </div>
      );
  }
}

const track = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

export function Principles() {
  return (
    <section className="section principles" aria-labelledby="principles-title">
      <div className="container">
        <div className="principles__head">
          <Eyebrow index="07">Why Auvier</Eyebrow>
          <SplitText as="h2" id="principles-title" className="principles__title" text="Standards we *don't* compromise on." />
        </div>
        <div className="bento">
          {principles.map((p, i) => (
            <motion.article
              key={p.title}
              className={`bento__card bento__card--${p.visual}`}
              onPointerMove={track}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.9, ease: EASE_OUT, delay: i * 0.08 }}
            >
              <Art kind={p.visual} />
              <div className="bento__text">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
