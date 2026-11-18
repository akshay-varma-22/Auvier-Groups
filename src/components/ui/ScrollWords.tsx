import { motion, useScroll } from "motion/react";
import { useRef, type CSSProperties } from "react";
import { parseAccents, stripAccents } from "./SplitText";

/**
 * A paragraph that "writes itself" word by word as it scrolls through view.
 *
 * One scroll value drives the whole paragraph through a single CSS variable
 * (--p); each word works out its own fade from its index in CSS. That's one
 * style write per frame instead of two animated values per word.
 */
export function ScrollWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });

  const words: { w: string; accent: boolean }[] = [];
  for (const seg of parseAccents(text)) {
    for (const w of seg.text.split(/\s+/).filter(Boolean)) words.push({ w, accent: seg.accent });
  }

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{stripAccents(text)}</span>
      <motion.span
        className="scroll-words"
        aria-hidden="true"
        style={{ "--p": scrollYProgress, "--n": words.length } as unknown as CSSProperties}
      >
        {words.map((word, i) => (
          <span key={i}>
            <span
              className={word.accent ? "scroll-words__word accent" : "scroll-words__word"}
              style={{ "--i": i } as CSSProperties}
            >
              {word.w}
            </span>{" "}
          </span>
        ))}
      </motion.span>
    </p>
  );
}
