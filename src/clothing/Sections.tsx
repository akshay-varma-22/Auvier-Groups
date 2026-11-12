import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useState, type FormEvent, type PointerEvent } from "react";
import { companies, group } from "../brand";
import { Button } from "../components/ui/Button";
import { Eyebrow } from "../components/ui/Eyebrow";
import { Mark } from "../components/ui/Logo";
import { SplitText } from "../components/ui/SplitText";
import { EASE_IN_OUT, EASE_OUT } from "../lib/intro";
import { composeMail } from "../lib/mail";
import { routes } from "../lib/routes";
import { collection, fabrics, notify, ticker, type Piece } from "./content";
import { Garment } from "./Garments";
import { Rail } from "./Rail";

const rise = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
};

export function Ticker() {
  const items = [...ticker, ...ticker];
  return (
    <div className="cl-ticker" aria-hidden="true">
      <div className="cl-ticker__track">
        {[0, 1].map((copy) => (
          <span key={copy} className="cl-ticker__group">
            {items.map((t, i) => (
              <span key={i} className="cl-ticker__item">
                {t}
                <i />
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

function PieceCard({ piece, index }: { piece: Piece; index: number }) {
  const [colour, setColour] = useState(piece.colours[0]);
  return (
    <motion.article className="cl-piece" {...rise} transition={{ duration: 1, ease: EASE_OUT, delay: index * 0.08 }}>
      <div className="cl-piece__stage">
        <span className="cl-piece__badge">Coming soon</span>
        {/* Each new colourway is "dyed" in from the hem upwards over the last one. */}
        <div className="cl-piece__dye">
          <AnimatePresence initial={false}>
            <motion.div
              key={colour.name}
              className="cl-piece__layer"
              initial={{ clipPath: "circle(0% at 50% 92%)" }}
              animate={{ clipPath: "circle(150% at 50% 92%)" }}
              exit={{ opacity: 0, transition: { delay: 0.75, duration: 0.2 } }}
              transition={{ duration: 0.95, ease: EASE_IN_OUT }}
            >
              <Garment
                kind={piece.kind}
                color={colour.hex}
                title={`${piece.name} in ${colour.name}`}
                className="cl-piece__garment"
                prefetch={piece.colours.map((c) => c.hex)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="cl-piece__info">
        <div className="cl-piece__head">
          <h3>{piece.name}</h3>
          <span className="cl-piece__n">0{index + 1}</span>
        </div>
        <p className="cl-piece__meta">
          {piece.fabric} · {piece.fit}
        </p>
        <div className="cl-piece__colours">
          <span className="cl-piece__colour" aria-live="polite">
            Colour: {colour.name}
          </span>
          <div className="cl-swatches" role="radiogroup" aria-label={`${piece.name} colours`}>
            {piece.colours.map((c) => (
              <button
                key={c.name}
                role="radio"
                aria-checked={c.name === colour.name}
                aria-label={c.name}
                className="cl-swatch"
                style={{ background: c.hex }}
                onClick={() => setColour(c)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function Collection() {
  return (
    <section id="collection" className="section section--sheet cl-collection" aria-labelledby="cl-collection-title">
      <div className="container">
        <header className="cl-head">
          <Eyebrow index="07">{collection.label}</Eyebrow>
          <SplitText as="h2" id="cl-collection-title" className="cl-head__title" text={collection.title} />
          <p className="cl-head__note">{collection.note}</p>
        </header>
      </div>
      <Rail />
      <div className="container">
        <p className="cl-collection__sub">Pick a colourway</p>
        <div className="cl-pieces">
          {collection.pieces.map((p, i) => (
            <PieceCard key={p.id} piece={p} index={i} />
          ))}
        </div>
        <div className="cl-collection__cta">
          <Button href="#notify">Get early access</Button>
        </div>
      </div>
    </section>
  );
}

/** A cut swatch you can tilt in the light, like holding it up to a window. */
function SwatchTile({ texture }: { texture: string }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const lx = useMotionValue(50);
  const ly = useMotionValue(30);
  const rotateX = useSpring(rx, { stiffness: 150, damping: 14 });
  const rotateY = useSpring(ry, { stiffness: 150, damping: 14 });
  const sheen = useMotionTemplate`radial-gradient(circle at ${lx}% ${ly}%, rgba(255,255,255,0.28), transparent 55%)`;
  const shadowX = useTransform(rotateY, [-14, 14], [16, -16]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 22);
    rx.set((0.5 - py) * 22);
    lx.set(px * 100);
    ly.set(py * 100);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
    lx.set(50);
    ly.set(30);
  };

  return (
    <div className="cl-swatch-hold" onPointerMove={move} onPointerLeave={reset}>
      <motion.div className="cl-swatch-shadow" style={{ x: shadowX }} aria-hidden="true" />
      <motion.div className={`cl-swatch-tile cl-swatch-tile--${texture}`} style={{ rotateX, rotateY }} aria-hidden="true">
        <span className="cl-swatch-tile__pinked" />
        <motion.span className="cl-swatch-tile__sheen" style={{ background: sheen }} />
      </motion.div>
    </div>
  );
}

export function Fabrics() {
  return (
    <section id="fabrics" className="section section--sheet cl-fabrics" aria-labelledby="cl-fabrics-title">
      <div className="container">
        <header className="cl-head">
          <Eyebrow index="08">Fabrics</Eyebrow>
          <SplitText as="h2" id="cl-fabrics-title" className="cl-head__title" text={fabrics.title} />
          <p className="cl-head__note">{fabrics.lede}</p>
        </header>
        <div className="cl-fabric-grid">
          {fabrics.items.map((f, i) => (
            <motion.article key={f.name} className="cl-fabric" {...rise} transition={{ duration: 1, ease: EASE_OUT, delay: i * 0.08 }}>
              <SwatchTile texture={f.texture} />
              <span className="cl-fabric__use">{f.use}</span>
              <h3>{f.name}</h3>
              <p>{f.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A hang tag on a string that swings as the pointer moves past. */
function SwingTag() {
  const push = useMotionValue(0);
  const rotate = useSpring(push, { stiffness: 55, damping: 2.6, mass: 0.8 });
  useEffect(() => {
    const onMove = (e: globalThis.PointerEvent) => {
      if (Math.abs(e.movementX) < 2) return;
      push.set(Math.max(-14, Math.min(14, e.movementX * 0.9)));
      window.setTimeout(() => push.set(0), 80);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [push]);

  return (
    <motion.div className="cl-swingtag" style={{ rotate }} aria-hidden="true">
      <span className="cl-swingtag__string" />
      <span className="cl-hangtag cl-hangtag--static">
        <span className="cl-hangtag__hole" />
        <Mark size={26} dot="button" />
        <span className="cl-hangtag__brand">Auvier</span>
        <span className="cl-hangtag__line">Early access</span>
        <span className="cl-hangtag__meta">
          <span>List</span>
          <span>C—01</span>
          <span>Status</span>
          <span>Open</span>
        </span>
      </span>
    </motion.div>
  );
}

export function Notify() {
  const [interests, setInterests] = useState<string[]>([]);
  const [size, setSize] = useState("");
  const [sent, setSent] = useState(false);

  const toggle = (v: string) => setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const lines = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone && `Mobile / WhatsApp: ${phone}`,
      interests.length > 0 && `Most interested in: ${interests.join(", ")}`,
      size && `Usual size: ${size}`,
    ].filter(Boolean);
    composeMail(
      group.email,
      `Auvier Clothing — Collection 01 waitlist (${name || email})`,
      `Hi Auvier Clothing,\n\nPlease add me to the Collection 01 list.\n\n${lines.join("\n")}`,
    );
    setSent(true);
  };

  return (
    <section id="notify" className="section cl-notify" aria-labelledby="cl-notify-title">
      <div className="container cl-notify__grid">
        <div className="cl-notify__copy">
          <Eyebrow index="09">Early access</Eyebrow>
          <SplitText as="h2" id="cl-notify-title" className="cl-head__title cl-notify__title" text={notify.title} />
          <p className="cl-notify__lede">{notify.lede}</p>
          <div className="cl-notify__card" aria-hidden="true">
            <Garment kind="polo" color="#dccfb6" />
            <Garment kind="tee" color="#5d6648" />
            <SwingTag />
          </div>
        </div>

        <motion.div className="cl-form" {...rise} transition={{ duration: 1, ease: EASE_OUT }}>
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              <motion.div key="sent" className="cl-form__sent" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <span className="cl-form__check" aria-hidden="true">
                  ✓
                </span>
                <h3>Almost on the list.</h3>
                <p>
                  We've opened your email app with everything filled in — just hit send. If nothing opened, write to us at{" "}
                  <a href={`mailto:${group.email}`}>{group.email}</a>.
                </p>
                <button className="cl-form__again" onClick={() => setSent(false)}>
                  Edit my details
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={onSubmit} exit={{ opacity: 0, y: -10 }}>
                <div className="brief__row">
                  <div className="field">
                    <input id="cl-name" name="name" type="text" autoComplete="name" required placeholder=" " />
                    <label htmlFor="cl-name">Your name</label>
                  </div>
                  <div className="field">
                    <input id="cl-email" name="email" type="email" autoComplete="email" required placeholder=" " />
                    <label htmlFor="cl-email">Email address</label>
                  </div>
                </div>
                <div className="field">
                  <input
                    id="cl-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder=" "
                    pattern="\+?[0-9\s\(\)\-]{7,20}"
                    title="Enter a valid mobile number, e.g. +91 98765 43210"
                  />
                  <label htmlFor="cl-phone">Mobile / WhatsApp (optional)</label>
                </div>
                <fieldset className="chips">
                  <legend>What are you most excited about?</legend>
                  <div className="chips__list">
                    {notify.interests.map((v) => (
                      <button key={v} type="button" className="chip" aria-pressed={interests.includes(v)} onClick={() => toggle(v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="chips">
                  <legend>Your usual size (optional)</legend>
                  <div className="chips__list">
                    {notify.sizes.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="chip chip--size"
                        aria-pressed={size === v}
                        onClick={() => setSize(size === v ? "" : v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="brief__submit">
                  <Button type="submit">Join the list</Button>
                  <span className="brief__note">Opens your email app with everything filled in.</span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

export function ClothingFooter() {
  return (
    <footer className="cl-footer">
      <div className="container">
        <div className="cl-footer__top">
          <div className="cl-footer__brand">
            <Mark size={36} dot="button" />
            <p>Premium everyday wear in natural fabrics and easy fits. Collection 01 — coming soon.</p>
          </div>
          <nav className="cl-footer__col" aria-label="Auvier Clothing">
            <span className="cl-footer__k">Auvier Clothing</span>
            <a href="#collection">Collection 01</a>
            <a href="#story">The story</a>
            <a href="#fabrics">Fabrics</a>
            <a href="#notify">Early access</a>
          </nav>
          <nav className="cl-footer__col" aria-label={group.name}>
            <span className="cl-footer__k">{group.name}</span>
            <a href={routes.group}>The group</a>
            <a href={routes.technologies}>{companies.technologies.name}</a>
          </nav>
          <div className="cl-footer__col">
            <span className="cl-footer__k">Say hello</span>
            <a href={`mailto:${group.email}`}>{group.email}</a>
          </div>
        </div>
        <p className="cl-footer__word" aria-hidden="true">
          Auvier <em>Clothing</em>
        </p>
        <div className="cl-footer__bottom">
          <span>
            © {group.year} {companies.clothing.name}. An {group.name} company.
          </span>
          <span>Collection 01 · Coming soon</span>
        </div>
      </div>
    </footer>
  );
}
