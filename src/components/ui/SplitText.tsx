import { motion, type Variants } from "motion/react";
import { createElement, Fragment } from "react";
import { EASE_OUT } from "../../lib/intro";

type Segment = { text: string; accent: boolean };

/** "Plain *accent words* plain" → segments. */
export function parseAccents(text: string): Segment[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("*") && part.endsWith("*")
        ? { text: part.slice(1, -1), accent: true }
        : { text: part, accent: false },
    );
}

export const stripAccents = (text: string) => text.replace(/\*/g, "");

/** Renders *accent* markup without animation. */
export function Accented({ text }: { text: string }) {
  return (
    <>
      {parseAccents(text).map((s, i) =>
        s.accent ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>,
      )}
    </>
  );
}

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  id?: string;
  className?: string;
  delay?: number;
  stagger?: number;
  /** Controlled mode: animate when true. Otherwise animates on first view. */
  show?: boolean;
};

/**
 * Word-by-word mask reveal. Screen readers get one clean string; the animated
 * pieces are hidden from them.
 */
export function SplitText({ text, as = "span", id, className, delay = 0, stagger = 0.05, show }: Props) {
  const words: { word: string; accent: boolean }[] = [];
  for (const seg of parseAccents(text)) {
    for (const word of seg.text.split(/\s+/).filter(Boolean)) words.push({ word, accent: seg.accent });
  }

  const word: Variants = {
    hidden: { y: "115%", rotate: 4 },
    show: (i: number) => ({
      y: "0%",
      rotate: 0,
      transition: { duration: 1.05, ease: EASE_OUT, delay: delay + i * stagger },
    }),
  };

  const trigger =
    show === undefined
      ? { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "0px 0px -12% 0px" } }
      : { initial: "hidden", animate: show ? "show" : "hidden" };

  const content = (
    <>
      <span className="sr-only">{stripAccents(text)}</span>
      <motion.span className="split" aria-hidden="true" {...trigger}>
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="split__mask">
              <motion.span className={w.accent ? "split__word accent" : "split__word"} variants={word} custom={i}>
                {w.word}
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        ))}
      </motion.span>
    </>
  );

  return createElement(as, { id, className }, content);
}
