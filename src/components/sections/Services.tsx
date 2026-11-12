import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { services } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

export function Services() {
  const [open, setOpen] = useState(0);

  return (
    <section id="services" className="section services" aria-labelledby="services-title">
      <div className="container">
        <div className="services__head">
          <Eyebrow index="03">Services</Eyebrow>
          <SplitText as="h2" id="services-title" className="services__title" text="Everything your website needs, *under one roof.*" />
          <p className="services__intro">
            Most businesses juggle a designer, a developer and a hosting company. With Auvier it's one team, one plan and
            one point of contact — from the first sketch to the day you go live, and after.
          </p>
        </div>

        <ul className="services__list">
          {services.map((s, i) => {
            const isOpen = open === i;
            return (
              <li key={s.title} className={isOpen ? "svc is-open" : "svc"}>
                <h3 className="svc__h">
                  <button
                    id={`svc-trigger-${i}`}
                    className="svc__trigger"
                    aria-expanded={isOpen}
                    aria-controls={`svc-panel-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    <span className="svc__num">0{i + 1}</span>
                    <span className="svc__title">{s.title}</span>
                    <span className="svc__line">{s.line}</span>
                    <span className="svc__toggle" aria-hidden="true">
                      <i />
                      <i />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`svc-panel-${i}`}
                      role="region"
                      aria-labelledby={`svc-trigger-${i}`}
                      className="svc__panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: EASE_OUT }}
                    >
                      <div className="svc__inner">
                        <p className="svc__body">{s.body}</p>
                        <ul className="svc__items">
                          {s.items.map((it, j) => (
                            <motion.li
                              key={it}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 + j * 0.05, duration: 0.5, ease: EASE_OUT }}
                            >
                              {it}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
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
