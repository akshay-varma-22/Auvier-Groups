import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Accented, SplitText } from "../../components/ui/SplitText";
import { EASE_OUT, useIntroReady } from "../../lib/intro";
import { scrollToTarget } from "../../lib/scroll";
import { storyHero } from "../content";
import { Garment } from "../Garments";
import { QuickNotify } from "../Hero";
import { CHAPTERS, T, type Chapter } from "./timeline";
import type { WorldOptions } from "./World";

/** The studio's controls, whether it runs in a worker or on the page. */
type Studio = {
  setProgress(p: number): void;
  setSize(width: number, height: number): void;
  setVisible(visible: boolean): void;
  setPointer(x: number, y: number): void;
  dispose(): void;
};

/**
 * Starts the 3D studio. Where the browser allows it, the studio renders in a
 * Web Worker on an OffscreenCanvas, so its build work and GPU driver stalls
 * can never freeze scrolling; otherwise it runs on the page as before.
 */
function startStudio(canvas: HTMLCanvasElement, opts: WorldOptions, onStatus: (s: "ready" | "failed") => void): Studio {
  if (typeof canvas.transferControlToOffscreen === "function" && typeof Worker !== "undefined") {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./world.worker.ts", import.meta.url), { type: "module" });
    } catch {
      worker = null;
    }
    if (worker) {
      const w = worker;
      const off = canvas.transferControlToOffscreen();
      w.onmessage = (e: MessageEvent<string>) => onStatus(e.data === "ready" ? "ready" : "failed");
      w.onerror = () => onStatus("failed");
      w.postMessage({ type: "init", canvas: off, opts }, [off]);
      return {
        setProgress: (value) => w.postMessage({ type: "progress", value }),
        setSize: (width, height) => w.postMessage({ type: "size", width, height }),
        setVisible: (value) => w.postMessage({ type: "visible", value }),
        setPointer: (x, y) => w.postMessage({ type: "pointer", x, y }),
        dispose: () => w.terminate(),
      };
    }
  }

  // On the page: three.js loads as its own chunk, after the page.
  const state = { progress: 0, width: opts.width, height: opts.height, visible: false, x: 0, y: 0 };
  let world: import("./World").World | null = null;
  let gone = false;
  import("./World")
    .then(({ World }) => {
      if (gone) return;
      try {
        world = new World(canvas, opts, () => onStatus("ready"));
        world.setProgress(state.progress);
        world.setSize(state.width, state.height);
        world.setPointer(state.x, state.y);
        world.setVisible(state.visible);
      } catch {
        onStatus("failed");
      }
    })
    .catch(() => onStatus("failed"));
  return {
    setProgress: (v) => {
      state.progress = v;
      world?.setProgress(v);
    },
    setSize: (w, h) => {
      state.width = w;
      state.height = h;
      world?.setSize(w, h);
    },
    setVisible: (v) => {
      state.visible = v;
      world?.setVisible(v);
    },
    setPointer: (x, y) => {
      state.x = x;
      state.y = y;
      world?.setPointer(x, y);
    },
    dispose: () => {
      gone = true;
      world?.dispose();
    },
  };
}

/** A chapter caption: blurs and rises in, holds, then drifts away. */
function Caption({ ch, p }: { ch: Chapter; p: MotionValue<number> }) {
  const [a, b] = ch.range;
  const last = ch.id === "ready";
  const fade = 0.022;
  // Scroll-linked keyframes must stay within 0–1; the last chapter simply stays.
  const at = last ? [a, a + fade] : [a, a + fade, b - fade, b];
  const opacity = useTransform(p, at, last ? [0, 1] : [0, 1, 1, 0]);
  const y = useTransform(p, last ? [a, a + fade * 1.4] : [a, a + fade * 1.4, b - fade, b], last ? [46, 0] : [46, 0, 0, -34]);
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? "hidden" : "visible"));

  return (
    <motion.article className={last ? "st-cap st-cap--final" : "st-cap"} style={{ opacity, y, visibility }}>
      <span className="st-cap__n">
        {ch.n} <span>/ 06</span>
        <i aria-hidden="true" />
        {ch.label}
      </span>
      <h2 className="st-cap__title">
        <Accented text={ch.title} />
      </h2>
      <p className="st-cap__body">{ch.body}</p>
      {last && (
        <div className="st-cap__cta">
          <QuickNotify />
        </div>
      )}
    </motion.article>
  );
}

/** Opening title over the spools. */
function StoryHero({ p }: { p: MotionValue<number> }) {
  const ready = useIntroReady();
  const opacity = useTransform(p, [0, T.intro[1] - 0.02, T.intro[1] + 0.004], [1, 1, 0]);
  const y = useTransform(p, [0, T.intro[1] + 0.004], [0, -60]);
  const visibility = useTransform(opacity, (o) => (o < 0.02 ? "hidden" : "visible"));
  return (
    <motion.header className="st-hero" style={{ opacity, y, visibility }}>
      <motion.p
        className="eyebrow st-hero__eyebrow"
        initial={{ opacity: 0, y: 12 }}
        animate={ready ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.9, ease: EASE_OUT }}
      >
        <span className="cl-pulse" aria-hidden="true" />
        {storyHero.eyebrow}
      </motion.p>
      <SplitText as="h1" className="st-hero__title" text={storyHero.title} show={ready} delay={0.15} stagger={0.07} />
      <motion.p
        className="st-hero__lede"
        initial={{ opacity: 0, y: 16 }}
        animate={ready ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 1, ease: EASE_OUT, delay: 0.5 }}
      >
        {storyHero.lede}
      </motion.p>
      <motion.a
        href="#notify"
        className="st-hero__soon"
        initial={{ opacity: 0, y: 16 }}
        animate={ready ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 1, ease: EASE_OUT, delay: 0.65 }}
      >
        <span className="st-hero__soon-dot" />
        Collection 01 — coming soon
        <span className="st-hero__soon-cta">Get early access →</span>
      </motion.a>
    </motion.header>
  );
}

/** Chapter rail: where you are in the story, and a way to jump. */
function Rail({ p, sectionRef }: { p: MotionValue<number>; sectionRef: RefObject<HTMLElement | null> }) {
  const [active, setActive] = useState(-1);
  useMotionValueEvent(p, "change", (v) => {
    let idx = -1;
    CHAPTERS.forEach((c, i) => {
      if (v >= c.range[0] - 0.01) idx = i;
    });
    setActive(idx);
  });
  const fill = useTransform(p, [T.thread[0], 1], [0, 1]);
  const railOpacity = useTransform(p, [T.intro[1] - 0.02, T.intro[1] + 0.01], [0, 1]);

  const jump = (c: Chapter) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollToTarget(top + travel * (c.range[0] + 0.03));
  };

  return (
    <motion.nav className="st-rail" aria-label="Story chapters" style={{ opacity: railOpacity }}>
      <span className="st-rail__track" aria-hidden="true">
        <motion.span style={{ scaleY: fill }} />
      </span>
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button className={i === active ? "is-active" : i < active ? "is-done" : undefined} onClick={() => jump(c)}>
              <span className="st-rail__n">{c.n}</span>
              <span className="st-rail__label">{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </motion.nav>
  );
}

/** Shown when WebGL isn't available. */
function Still() {
  return (
    <div className="st-still" aria-hidden="true">
      <Garment kind="overshirt" color="#c9bda6" className="st-still__a" />
      <Garment kind="tee" color="#5b6446" className="st-still__b" />
    </div>
  );
}

export function Story3D() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const studio = useRef<Studio | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(p, "change", (v) => studio.current?.setProgress(v));

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // a fresh canvas each time: a canvas can only be handed to a worker once
    const canvas = document.createElement("canvas");
    canvas.className = "st__canvas";
    stage.appendChild(canvas);
    canvasRef.current = canvas;

    let live = true;
    const s = startStudio(
      canvas,
      {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        dpr: window.devicePixelRatio || 1,
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        coarse: window.matchMedia("(pointer: coarse)").matches,
      },
      (next) => live && setStatus(next),
    );
    s.setProgress(p.get());
    studio.current = s;

    let inView = false;
    const sync = () => s.setVisible(inView && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => s.setSize(canvas.clientWidth, canvas.clientHeight));
    ro.observe(canvas);
    // the canvas fills the viewport while it's in view, so no layout reads are needed
    const onMove = (e: PointerEvent) => {
      if (inView) s.setPointer((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", sync);

    return () => {
      live = false;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", sync);
      s.dispose();
      studio.current = null;
      canvasRef.current = null;
      canvas.remove();
    };
  }, [p]);

  useEffect(() => {
    canvasRef.current?.classList.toggle("is-ready", status === "ready");
  }, [status]);

  const cue = useTransform(p, [0, 0.03], [1, 0]);
  // the finale's caption sits above the stack, so the veil can lift
  const veil = useTransform(p, [T.ready[0], T.ready[0] + 0.025], [1, 0.2]);

  return (
    <section ref={ref} id="story" className="st" aria-label="How Auvier Clothing is made">
      <div className="st__sticky">
        <div ref={stageRef} className="st__stage" aria-hidden="true" />
        {status === "failed" && <Still />}
        <motion.div className="st__veil" style={{ opacity: veil }} aria-hidden="true" />

        <StoryHero p={p} />
        <div className="st__captions">
          {CHAPTERS.map((c) => (
            <Caption key={c.id} ch={c} p={p} />
          ))}
        </div>
        <Rail p={p} sectionRef={ref} />

        <motion.div className="st-cue" style={{ opacity: cue }} aria-hidden="true">
          <span>Scroll to watch it come together</span>
          <i />
        </motion.div>

        <AnimatePresence>
          {status === "loading" && (
            <motion.div className="st-loading" exit={{ opacity: 0, transition: { duration: 0.8 } }} aria-hidden="true">
              <span>Setting up the studio</span>
              <i />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
