import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useInView,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef, type ReactNode } from "react";
import { marquee } from "../../content";
import { REDUCED_MOTION, useMedia } from "../../lib/useMedia";

const COPIES = 4;
const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

/** Infinite ticker whose speed and direction follow scroll velocity. */
function VelocityRow({ base, children }: { base: number; children: ReactNode }) {
  const reduced = useMedia(REDUCED_MOTION);
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(velocity, [0, 1000], [0, 4], { clamp: false });
  const direction = useRef(1);
  const translate = useTransform(x, (v) => `${wrap(-100 / COPIES, 0, v)}%`);
  const row = useRef<HTMLDivElement>(null);
  const visible = useInView(row, { margin: "100px" });

  useAnimationFrame((_, delta) => {
    if (reduced || !visible) return;
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    const move = direction.current * base * (delta / 1000) * (1 + Math.abs(f));
    x.set(x.get() + move);
  });

  return (
    <div ref={row} className="marquee__row">
      <motion.div className="marquee__track" style={{ x: translate }}>
        {Array.from({ length: COPIES }, (_, i) => (
          <span key={i} className="marquee__group" aria-hidden={i > 0}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Marquee() {
  const items = marquee.map((m) => (
    <span key={m} className="marquee__item">
      {m}
      <svg className="marquee__star" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" fill="currentColor" />
      </svg>
    </span>
  ));

  return (
    <section className="marquee theme-ember" aria-label="What we make">
      <VelocityRow base={-2.2}>{items}</VelocityRow>
    </section>
  );
}
