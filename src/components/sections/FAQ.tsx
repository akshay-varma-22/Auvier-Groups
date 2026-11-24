import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { faqs, site } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

export function FAQ() {
  const [open, setOpen] = useState<number>(-1);

  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="container faq__grid">
        <div className="faq__aside">
          <Eyebrow index="08">FAQ</Eyebrow>
          <SplitText as="h2" id="faq-title" className="faq__title" text="Good *questions.*" />
          <p className="faq__hint">
            Something else on your mind? <a href={`mailto:${site.email}`}>Email us</a> — a real person replies.
          </p>
        </div>
        <ul className="faq__list">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className={isOpen ? "qa is-open" : "qa"}>
                <h3>
                  <button
                    id={`qa-trigger-${i}`}
                    className="qa__q"
                    aria-expanded={isOpen}
                    aria-controls={`qa-panel-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span>{f.q}</span>
                    <span className="qa__icon" aria-hidden="true">
                      <i />
                      <i />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`qa-panel-${i}`}
                      role="region"
                      aria-labelledby={`qa-trigger-${i}`}
                      className="qa__a"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE_OUT }}
                    >
                      <p>{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
