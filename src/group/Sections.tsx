import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { companies, group } from "../brand";
import { Garment } from "../clothing/Garments";
import { BuildPreview } from "../components/hero/BuildPreview";
import { Arrow, Button } from "../components/ui/Button";
import { Eyebrow } from "../components/ui/Eyebrow";
import { Mark, type MarkDot } from "../components/ui/Logo";
import { ScrollWords } from "../components/ui/ScrollWords";
import { SplitText } from "../components/ui/SplitText";
import { projects } from "../content";
import { EASE_OUT } from "../lib/intro";
import { routes } from "../lib/routes";
import { scrollToTarget } from "../lib/scroll";
import { about, contact, hero, principles, profiles } from "./content";

const rise = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
};

function CompanyLockup({ dot, label, size = 30 }: { dot: MarkDot; label: string; size?: number }) {
  return (
    <span className="lockup">
      <Mark size={size} dot={dot} />
      <span className="lockup__word">Auvier</span>
      <span className="lockup__sub">{label}</span>
    </span>
  );
}

/** Live preview that cycles through the studio's three stages. */
function CyclingPreview() {
  const [stage, setStage] = useState(2);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // only cycles while it's on screen, so it never re-renders while you scroll elsewhere
  const inView = useInView(ref);
  useEffect(() => {
    if (reduced || !inView) return;
    const t = window.setInterval(() => setStage((s) => (s + 1) % 3), 3600);
    return () => window.clearInterval(t);
  }, [reduced, inView]);
  return (
    <div ref={ref} className="cycling-preview">
      <BuildPreview stage={stage} />
    </div>
  );
}

export function GroupHero() {
  return (
    <section id="top" className="g-hero" aria-labelledby="g-hero-title">
      <div className="container">
        <div className="g-hero__head">
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          >
            <span className="eyebrow__index">{group.name}</span>
            <span>{hero.eyebrow}</span>
          </motion.p>
          <SplitText as="h1" id="g-hero-title" className="g-hero__title" text={hero.title} show delay={0.1} stagger={0.06} />
          <motion.div
            className="g-hero__side"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE_OUT, delay: 0.5 }}
          >
            <p className="g-hero__lede">{hero.lede}</p>
            <div className="g-hero__actions">
              <Button href="#companies" icon="down">
                Our companies
              </Button>
              <Button href="#contact" variant="ghost" icon="none">
                Contact the group
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="doors"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.55 }}
        >
          <a href={routes.technologies} className="door door--tech" data-cursor="view" data-cursor-label="Visit">
            <div className="door__top">
              <span className="door__index">01</span>
              <span className="door__status">
                <i />
                {companies.technologies.status}
              </span>
            </div>
            <div className="door__visual" aria-hidden="true">
              <div className="door__bp">
                <CyclingPreview />
              </div>
            </div>
            <div className="door__bottom">
              <CompanyLockup dot="live" label="Technologies" />
              <p>{companies.technologies.tagline}</p>
              <span className="door__cta">
                Visit {companies.technologies.name} <Arrow />
              </span>
            </div>
          </a>

          <a href={routes.clothing} className="door door--clothing" data-cursor="view" data-cursor-label="Visit">
            <div className="door__top">
              <span className="door__index">02</span>
              <span className="door__status">
                <i />
                {companies.clothing.status}
              </span>
            </div>
            <div className="door__visual" aria-hidden="true">
              <div className="door__flatlay">
                <Garment kind="overshirt" color="#c9bda6" className="door__g door__g--a" />
                <Garment kind="tee" color="#5d6648" className="door__g door__g--b" />
                <Garment kind="polo" color="#3b3936" className="door__g door__g--c" />
              </div>
            </div>
            <div className="door__bottom">
              <CompanyLockup dot="button" label="Clothing" />
              <p>{companies.clothing.tagline}</p>
              <span className="door__cta">
                Visit {companies.clothing.name} <Arrow />
              </span>
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="section g-about" aria-label="About the group">
      <div className="container">
        <div className="g-about__grid">
          <Eyebrow index="01">About the group</Eyebrow>
          <ScrollWords text={about.statement} className="g-about__text" />
        </div>
        <dl className="g-stats">
          {about.stats.map((s, i) => (
            <motion.div key={s.label} {...rise} transition={{ duration: 0.9, ease: EASE_OUT, delay: i * 0.1 }}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function Companies() {
  const shots = projects.filter((p) => p.shots).slice(0, 3);
  return (
    <section id="companies" className="section section--sheet theme-ink g-companies" aria-labelledby="g-companies-title">
      <div className="container">
        <header className="g-head">
          <Eyebrow index="02">Our companies</Eyebrow>
          <SplitText as="h2" id="g-companies-title" className="g-head__title" text="Built for *different* customers. Run to the same standard." />
        </header>

        <motion.article className="profile profile--tech" {...rise} transition={{ duration: 1, ease: EASE_OUT }}>
          <div className="profile__copy">
            <span className="profile__index">01 / 02</span>
            <CompanyLockup dot="live" label="Technologies" size={40} />
            <p className="profile__sector">{companies.technologies.sector}</p>
            <p className="profile__body">{profiles.technologies.body}</p>
            <dl className="profile__facts">
              <div>
                <dt>What they do</dt>
                <dd>{profiles.technologies.offers.join(" · ")}</dd>
              </div>
              <div>
                <dt>Recent clients</dt>
                <dd>{profiles.technologies.clients.join(", ")}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className="profile__live" /> {companies.technologies.status}
                </dd>
              </div>
            </dl>
            <Button href={routes.technologies}>Visit {companies.technologies.name}</Button>
          </div>
          <div className="profile__visual profile__visual--tech" aria-hidden="true">
            {shots.map((p, i) => (
              <figure key={p.id} className={`fan fan--${i}`}>
                <img src={p.shots!.desktop} alt="" loading="lazy" decoding="async" width={1800} height={1125} />
              </figure>
            ))}
          </div>
        </motion.article>

        <motion.article className="profile profile--clothing" {...rise} transition={{ duration: 1, ease: EASE_OUT }}>
          <div className="profile__copy">
            <span className="profile__index">02 / 02</span>
            <CompanyLockup dot="button" label="Clothing" size={40} />
            <p className="profile__sector">{companies.clothing.sector}</p>
            <p className="profile__body">{profiles.clothing.body}</p>
            <dl className="profile__facts">
              <div>
                <dt>The range</dt>
                <dd>{profiles.clothing.offers.join(" · ")}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className="profile__soon" /> {companies.clothing.status}
                </dd>
              </div>
            </dl>
            <Button href={routes.clothing}>Visit {companies.clothing.name}</Button>
          </div>
          <div className="profile__visual profile__visual--clothing" aria-hidden="true">
            {(
              [
                ["tee", "#ebe3d3"],
                ["overshirt", "#2d3544"],
                ["trouser", "#9c8c78"],
                ["polo", "#9b5839"],
              ] as const
            ).map(([kind, colour]) => (
              <div key={kind} className="profile__garment">
                <Garment kind={kind} color={colour} />
              </div>
            ))}
          </div>
        </motion.article>
      </div>
    </section>
  );
}

export function Principles() {
  return (
    <section id="principles" className="section theme-ink g-principles" aria-labelledby="g-principles-title">
      <div className="container">
        <header className="g-head">
          <Eyebrow index="03">Principles</Eyebrow>
          <SplitText as="h2" id="g-principles-title" className="g-head__title" text="What every Auvier company *shares.*" />
        </header>
        <ol className="g-principles__list">
          {principles.map((p, i) => (
            <motion.li key={p.title} {...rise} transition={{ duration: 0.9, ease: EASE_OUT, delay: i * 0.08 }}>
              <span className="g-principles__n">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="section section--sheet g-contact" aria-labelledby="g-contact-title">
      <div className="container">
        <header className="g-head g-head--contact">
          <Eyebrow index="04">Contact</Eyebrow>
          <SplitText as="h2" id="g-contact-title" className="g-head__title" text={contact.title} />
          <p className="g-head__lede">{contact.lede}</p>
        </header>
        <div className="g-cards">
          <motion.a href={`mailto:${group.email}`} className="g-card g-card--group" {...rise} transition={{ duration: 0.9, ease: EASE_OUT }}>
            <span className="g-card__k">General &amp; partnerships</span>
            <span className="g-card__title">{group.email}</span>
            <span className="g-card__cta">
              Write to the group <Arrow direction="up-right" />
            </span>
          </motion.a>
          <motion.a
            href={`${routes.technologies}#contact`}
            className="g-card g-card--tech"
            {...rise}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.08 }}
          >
            <span className="g-card__k">Need a website?</span>
            <span className="g-card__title">Start a project with {companies.technologies.name}</span>
            <span className="g-card__cta">
              Go to the project brief <Arrow />
            </span>
          </motion.a>
          <motion.a
            href={`${routes.clothing}#notify`}
            className="g-card g-card--clothing"
            {...rise}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.16 }}
          >
            <span className="g-card__k">Auvier Clothing</span>
            <span className="g-card__title">Get early access to Collection 01</span>
            <span className="g-card__cta">
              Join the list <Arrow />
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  );
}

export function GroupFooter() {
  return (
    <footer className="footer footer--group theme-ink">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Mark size={40} dot="solid" />
            <p>{group.name} is the parent company of {companies.technologies.name} and {companies.clothing.name}.</p>
          </div>
          <nav className="footer__nav" aria-label="The group">
            <span className="footer__k">The group</span>
            {[
              { label: "About", href: "#about" },
              { label: "Principles", href: "#principles" },
              { label: "Contact", href: "#contact" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="footer__link">
                <span className="roll" data-text={l.label}>
                  <span>{l.label}</span>
                </span>
              </a>
            ))}
          </nav>
          <nav className="footer__nav" aria-label="Our companies">
            <span className="footer__k">Our companies</span>
            {[
              { label: companies.technologies.name, href: routes.technologies },
              { label: companies.clothing.name, href: routes.clothing },
            ].map((l) => (
              <a key={l.href} href={l.href} className="footer__link">
                <span className="roll" data-text={l.label}>
                  <span>{l.label}</span>
                </span>
              </a>
            ))}
          </nav>
          <div className="footer__contact">
            <span className="footer__k">Contact</span>
            <a href={`mailto:${group.email}`} className="footer__email">
              {group.email}
            </a>
            <button className="footer__top-btn" onClick={() => scrollToTarget(0)}>
              Back to top
              <span aria-hidden="true">
                <Arrow direction="up-right" />
              </span>
            </button>
          </div>
        </div>
        <div className="footer__word" aria-hidden="true">
          {"Auvier".split("").map((ch, i) => (
            <span key={i} className="footer__mask">
              <motion.span
                initial={{ y: "100%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: i * 0.06 }}
              >
                {ch}
              </motion.span>
            </span>
          ))}
        </div>
        <div className="footer__bottom">
          <span>
            © {group.year} {group.name}. All rights reserved.
          </span>
          <span>
            {companies.technologies.name} · {companies.clothing.name}
          </span>
        </div>
      </div>
    </footer>
  );
}
