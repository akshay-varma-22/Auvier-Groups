import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { rail } from "./content";
import { Garment } from "./Garments";

/* A clothing rail you can drag. Garments hang from hooks and swing with the
   rail's momentum — and with a nudge when the pointer brushes past them. */

function Hanging({ item, index, swing }: { item: (typeof rail)[number]; index: number; swing: MotionValue<number> }) {
  const nudge = useMotionValue(0);
  const nudgeSpring = useSpring(nudge, { stiffness: 70, damping: 3.2, mass: 0.6 });
  // Heavier pieces swing a little less.
  const weight = item.kind === "trouser" ? 0.75 : item.kind === "overshirt" ? 0.88 : 1;
  const rotate = useTransform(() => swing.get() * weight + nudgeSpring.get());

  const brush = (e: PointerEvent) => {
    const dir = e.movementX >= 0 ? 1 : -1;
    nudge.set(dir * 7 * weight);
    window.setTimeout(() => nudge.set(0), 90);
  };

  return (
    <motion.li className={`cl-hang cl-hang--${item.kind}`} style={{ rotate }} onPointerEnter={brush}>
      <div className="cl-hang__sway" style={{ "--i": index } as CSSProperties}>
        <Garment kind={item.kind} color={item.hex} hanger title={`${item.name} in ${item.colour}`} />
        <span className="cl-hang__tag" aria-hidden="true">
          <span className="cl-hang__tag-name">{item.name}</span>
          <span className="cl-hang__tag-colour">{item.colour}</span>
        </span>
      </div>
    </motion.li>
  );
}

export function Rail() {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const x = useMotionValue(0);
  const velocity = useVelocity(x);
  // Drag left and the clothes lag behind, swinging right — and back again.
  const swing = useSpring(useTransform(velocity, [-2600, 0, 2600], [16, 0, -16]), { stiffness: 110, damping: 5, mass: 0.7 });
  const [min, setMin] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !track.current) return;
      setMin(Math.min(0, viewport.current.clientWidth - track.current.scrollWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, []);

  const shift = (dir: -1 | 1) => {
    const step = (viewport.current?.clientWidth ?? 600) * 0.6;
    const to = Math.max(min, Math.min(0, x.get() - dir * step));
    animate(x, to, { type: "spring", stiffness: 120, damping: 22 });
  };

  return (
    <div className="cl-rail">
      <div className="cl-rail__bar" aria-hidden="true" />
      <div ref={viewport} className="cl-rail__viewport" data-cursor="grab" data-cursor-label="Drag">
        <motion.ul
          ref={track}
          className="cl-rail__track"
          aria-label="Collection 01 on the rail"
          drag="x"
          dragConstraints={{ left: min, right: 0 }}
          dragElastic={0.06}
          dragTransition={{ power: 0.3, timeConstant: 360 }}
          style={{ x }}
        >
          {rail.map((item, i) => (
            <Hanging key={`${item.kind}-${item.colour}`} item={item} index={i} swing={swing} />
          ))}
        </motion.ul>
      </div>
      <div className="cl-rail__controls">
        <span className="cl-rail__hint">Drag the rail</span>
        <span className="cl-rail__buttons">
          <button className="cl-rail__btn" aria-label="Previous pieces" onClick={() => shift(-1)}>
            ←
          </button>
          <button className="cl-rail__btn" aria-label="More pieces" onClick={() => shift(1)}>
            →
          </button>
        </span>
      </div>
    </div>
  );
}
