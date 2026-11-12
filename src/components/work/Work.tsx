import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { projects, type Project } from "../../content";
import { EASE_IN_OUT, EASE_OUT } from "../../lib/intro";
import { lockScroll } from "../../lib/scroll";
import { useMedia } from "../../lib/useMedia";
import { Arrow } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";
import { BrowserFrame, Mockup, PhoneFrame } from "./Mockups";

const panelVars = (p: Project) => ({ "--panel": p.panel, "--panel-ink": p.panelInk }) as CSSProperties;
const pad = (n: number) => String(n).padStart(2, "0");
const hostOf = (p: Project) => (p.url ? new URL(p.url).host.replace(/^www\./, "") : `${p.id}.com`);

const clientWork = projects.filter((p) => p.kind === "client");
const conceptWork = projects.filter((p) => p.kind === "concept");

type Origin = DOMRect | null;

export function Work() {
  const stacking = useMedia("(min-width: 900px)");
  const [open, setOpen] = useState<{ index: number; origin: Origin } | null>(null);
  const openProject = (p: Project, origin: Origin) => setOpen({ index: projects.indexOf(p), origin });

  return (
    <section id="work" className="section section--sheet theme-paper work" aria-labelledby="work-title">
      <div className="container">
        <header className="work__head">
          <Eyebrow index="02">Selected work</Eyebrow>
          <SplitText as="h2" id="work-title" className="work__title" text="Live sites, *real clients.*" />
          <p className="work__note">
            Websites we've designed, built and launched for clients — followed by concept builds from our lab.
          </p>
        </header>

        <Stack items={clientWork} stacking={stacking} onOpen={openProject} />

        <header className="work__head work__head--lab">
          <Eyebrow>Concept lab</Eyebrow>
          <SplitText as="h3" className="work__title work__title--sub" text="Concept builds, *real craft.*" />
          <p className="work__note">
            Self-initiated projects that show how we think and build — strategy, art direction and code, end to end.
          </p>
        </header>

        <Stack items={conceptWork} stacking={stacking} onOpen={openProject} />
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <CaseStudy
              key="case"
              index={open.index}
              origin={open.origin}
              onClose={() => setOpen(null)}
              onNext={() => setOpen({ index: (open.index + 1) % projects.length, origin: null })}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  );
}

/** A group of cards that pin and stack as you scroll through them. */
function Stack({
  items,
  stacking,
  onOpen,
}: {
  items: Project[];
  stacking: boolean;
  onOpen: (p: Project, origin: Origin) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <div ref={ref} className="work__stack">
      {items.map((p, i) => (
        <ProjectCard
          key={p.id}
          project={p}
          index={i}
          total={items.length}
          progress={scrollYProgress}
          stacking={stacking}
          onOpen={(origin) => onOpen(p, origin)}
        />
      ))}
    </div>
  );
}

/** Real screenshots (desktop + phone) for client work, a coded mockup for concepts. */
function Preview({ project: p }: { project: Project }) {
  if (!p.shots) {
    return (
      <BrowserFrame url={hostOf(p)}>
        <Mockup kind={p.mockup!} />
      </BrowserFrame>
    );
  }
  return (
    <div className="preview">
      <BrowserFrame url={hostOf(p)}>
        <img
          className="frame__shot"
          src={p.shots.desktop}
          alt={`${p.name} website — desktop homepage`}
          width={1800}
          height={1125}
          loading="lazy"
          decoding="async"
        />
      </BrowserFrame>
      <PhoneFrame>
        <img
          src={p.shots.mobile}
          alt={`${p.name} website on a phone`}
          width={780}
          height={1688}
          loading="lazy"
          decoding="async"
        />
      </PhoneFrame>
    </div>
  );
}

function ProjectCard({
  project: p,
  index,
  total,
  progress,
  stacking,
  onOpen,
}: {
  project: Project;
  index: number;
  total: number;
  progress: MotionValue<number>;
  stacking: boolean;
  onOpen: (origin: Origin) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const scale = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.045]);
  const open = () => onOpen(cardRef.current?.getBoundingClientRect() ?? null);
  const isClient = p.kind === "client";

  return (
    <div className="pcard-wrap" style={{ ...panelVars(p), top: stacking ? `calc(9vh + ${index * 26}px)` : undefined }}>
      <motion.article
        ref={cardRef}
        className="pcard"
        style={stacking ? { scale } : undefined}
        initial={{ opacity: 0, y: 80 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1, ease: EASE_OUT }}
      >
        <div className="pcard__info">
          <div className="pcard__top">
            <span className="pcard__index">
              {pad(index + 1)} <span>/ {pad(total)}</span>
            </span>
            <span className="pcard__type">{p.type}</span>
          </div>
          <div>
            <h3 className="pcard__name">{p.name}</h3>
            <p className="pcard__sector">{p.sector}</p>
          </div>
          <p className="pcard__summary">{p.summary}</p>
          <ul className="pcard__tags" aria-label="Project tags">
            {isClient ? (
              <li className="is-badge">
                <span className="pcard__live" aria-hidden="true" />
                Live site
              </li>
            ) : (
              <li className="is-badge">Concept</li>
            )}
            {p.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="pcard__actions">
            <button className="pcard__open" onClick={open}>
              <span>View case study</span>
              <span className="pcard__open-icon">
                <Arrow />
              </span>
            </button>
            {p.url && (
              <a className="pcard__visit" href={p.url} target="_blank" rel="noopener noreferrer">
                Visit site
                <Arrow direction="up-right" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>

        <div className="pcard__media" data-cursor="view" data-cursor-label="Open" onClick={open}>
          <div className="pcard__frame">
            <Preview project={p} />
          </div>
        </div>
      </motion.article>
    </div>
  );
}

function CaseStudy({
  index,
  origin,
  onClose,
  onNext,
}: {
  index: number;
  origin: Origin;
  onClose: () => void;
  onNext: () => void;
}) {
  const p = projects[index];
  const next = projects[(index + 1) % projects.length];
  const isClient = p.kind === "client";
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const from = origin
    ? `inset(${origin.top}px ${window.innerWidth - origin.right}px ${window.innerHeight - origin.bottom}px ${origin.left}px round 28px)`
    : "inset(100% 0px 0px 0px round 0px)";

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    lockScroll(true);
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      previous?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [index]);

  return (
    <motion.div
      className="case"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-title"
      style={panelVars(p)}
      initial={{ clipPath: from }}
      animate={{ clipPath: "inset(0px 0px 0px 0px round 0px)" }}
      exit={{ clipPath: "inset(0px 0px 100% 0px round 0px)", transition: { duration: 0.75, ease: EASE_IN_OUT } }}
      transition={{ duration: 0.95, ease: EASE_IN_OUT }}
    >
      <div ref={scrollRef} className="case__scroll" data-lenis-prevent>
        <div className="case__top container">
          <span className="eyebrow">
            <span className="eyebrow__index">Case study</span>
            <span>{isClient ? "Client project" : "Concept project"}</span>
          </span>
          <button ref={closeRef} className="case__close" onClick={onClose}>
            Close
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.8, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          >
            <header className="case__hero container">
              <h2 id="case-title" className="case__title">
                {p.name}
              </h2>
              <p className="case__summary">{p.summary}</p>
              <dl className="case__facts">
                <div>
                  <dt>{isClient ? "Client" : "Sector"}</dt>
                  <dd>{p.sector}</dd>
                </div>
                <div>
                  <dt>Project</dt>
                  <dd>{p.type}</dd>
                </div>
                {p.stack && (
                  <div>
                    <dt>Built with</dt>
                    <dd>{p.stack.join(", ")}</dd>
                  </div>
                )}
                {p.url && (
                  <div>
                    <dt>Live site</dt>
                    <dd>
                      <a className="case__link" href={p.url} target="_blank" rel="noopener noreferrer">
                        {hostOf(p)} <Arrow direction="up-right" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </header>

            <div className="case__media">
              <div className="container">
                <Preview project={p} />
              </div>
            </div>

            <div className="case__body container">
              <section>
                <h3>{isClient ? "The brief" : "The challenge"}</h3>
                <p>{p.challenge}</p>
              </section>
              <section>
                <h3>Our approach</h3>
                <p>{p.approach}</p>
              </section>
              <section>
                <h3>What we built</h3>
                <ul>
                  {p.built.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </section>
            </div>

            {p.shots && (
              <div className="case__gallery container">
                {p.shots.gallery.map((src, i) => (
                  <figure key={src} className="case__shot">
                    <img
                      src={src}
                      alt={`${p.name} website — page section ${i + 1}`}
                      width={1800}
                      height={1125}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                ))}
              </div>
            )}

            <div className="case__foot container">
              {p.url && (
                <a className="case__visit" href={p.url} target="_blank" rel="noopener noreferrer">
                  Visit the live site
                  <Arrow direction="up-right" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              <button className="case__next" onClick={onNext} data-cursor="view" data-cursor-label="Next">
                <span className="case__next-k">Next project</span>
                <span className="case__next-name">
                  {next.name}
                  <Arrow />
                </span>
              </button>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
