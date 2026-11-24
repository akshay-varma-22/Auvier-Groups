import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { local } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

const rise = (i: number) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 0.9, delay: i * 0.08, ease: EASE_OUT },
});

/** Fixed-price website + assistant package for local businesses, with live demo sites. */
export function LocalOffer() {
  return (
    <section id="local" className="section section--sheet theme-paper local" aria-labelledby="local-title">
      <div className="container">
        <div className="local__head">
          <Eyebrow index="04">{local.eyebrow}</Eyebrow>
          <SplitText as="h2" id="local-title" className="local__title" text={local.heading} />
          <p className="local__intro">{local.intro}</p>
        </div>

        <ul className="local__problems">
          {local.problems.map((p, i) => (
            <motion.li key={p.title} {...rise(i)}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </motion.li>
          ))}
        </ul>

        <ul className="plans" aria-label="Pricing">
          {local.plans.map((plan, i) => (
            <motion.li key={plan.name} className={plan.featured ? "plan plan--featured" : "plan"} {...rise(i)}>
              {plan.featured && <span className="plan__tag">Most popular</span>}
              <h3 className="plan__name">{plan.name}</h3>
              <p className="plan__price">
                <strong>{plan.price}</strong> <span>{plan.per}</span>
              </p>
              <p className="plan__blurb">{plan.blurb}</p>
              <ul className="plan__items">
                {plan.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ul>

        <div className="local__cta">
          <Button href="#contact">Get a free mock-up</Button>
          <p>{local.location}</p>
        </div>

        <div className="local__demos">
          <h3 className="local__demos-title">See it working on a real-looking site</h3>
          <ul>
            {local.demos.map((d, i) => (
              <motion.li key={d.href} {...rise(i)}>
                <a className="demo" href={d.href} target="_blank" rel="noopener" style={{ "--panel": d.panel } as CSSProperties}>
                  <span className="demo__sector">{d.sector}</span>
                  <span className="demo__name">{d.name}</span>
                  <span className="demo__body">{d.body}</span>
                  <span className="demo__open">
                    Open demo <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </span>
                </a>
              </motion.li>
            ))}
          </ul>
          <p className="local__note">{local.assistantNote}</p>
        </div>
      </div>
    </section>
  );
}
