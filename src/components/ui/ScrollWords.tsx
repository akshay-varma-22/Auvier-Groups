import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { parseAccents, stripAccents } from "./SplitText";

function Word({ children, accent, progress, range }: {
  children: string;
  accent: boolean;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, [8, 0]);
  return (
    <motion.span className={accent ? "scroll-words__word accent" : "scroll-words__word"} style={{ opacity, y }}>
      {children}
    </motion.span>
  );
}

/** A paragraph that "writes itself" word by word as it scrolls through view. */
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
      <span aria-hidden="true">
        {words.map((word, i) => {
          const start = i / words.length;
          return (
            <span key={i}>
              <Word accent={word.accent} progress={scrollYProgress} range={[start, start + 1 / words.length]}>
                {word.w}
              </Word>{" "}
            </span>
          );
        })}
      </span>
    </p>
  );
}
