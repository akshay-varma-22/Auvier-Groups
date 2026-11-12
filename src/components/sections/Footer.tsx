import { motion } from "motion/react";
import { companies, group } from "../../brand";
import { navLinks, site } from "../../content";
import { EASE_OUT } from "../../lib/intro";
import { routes } from "../../lib/routes";
import { scrollToTarget } from "../../lib/scroll";
import { Arrow } from "../ui/Button";
import { Mark } from "../ui/Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Mark size={40} />
            <p>
              {site.name} designs, develops and deploys websites people remember — part of {group.name}.
            </p>
          </div>
          <nav className="footer__nav" aria-label="Footer">
            <span className="footer__k">Explore</span>
            {[...navLinks, { label: "Contact", href: "#contact" }].map((l) => (
              <a key={l.href} href={l.href} className="footer__link">
                <span className="roll" data-text={l.label}>
                  <span>{l.label}</span>
                </span>
              </a>
            ))}
          </nav>
          <nav className="footer__nav" aria-label={group.name}>
            <span className="footer__k">{group.name}</span>
            {[
              { label: "The group", href: routes.group },
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
            <span className="footer__k">New business</span>
            <a href={`mailto:${site.email}`} className="footer__email">
              {site.email}
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
            © {site.year} {site.name}. An {group.name} company.
          </span>
          <span>Designed, developed &amp; deployed in-house.</span>
        </div>
      </div>
    </footer>
  );
}
