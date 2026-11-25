import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { shipLog } from "../../content";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { SplitText } from "../ui/SplitText";

const DURATIONS = [0.4, 1.2, 0.8, 0.6, 0.3, 2.1];
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0).toFixed(1);

/** A deploy pipeline that runs when it scrolls into view — and on demand. */
export function Ship() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -25% 0px" });
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    let i = -1;
    let timer = 0;
    setStep(-1);
    const tick = () => {
      i += 1;
      setStep(i);
      if (i < shipLog.length) timer = window.setTimeout(tick, 380 + DURATIONS[i] * 160);
    };
    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, [inView, run]);

  const done = step >= shipLog.length;

  return (
    <section className="section ship" aria-labelledby="ship-title">
      <div className="container ship__grid">
        <div className="ship__copy">
          <Eyebrow index="05">Launch</Eyebrow>
          <SplitText as="h2" id="ship-title" className="ship__title" text="Launch day, *minus the drama.*" />
          <p className="ship__text">
            Deployment isn't an afterthought we pass to someone else. We set up hosting, domains, SSL, analytics and
            automated deploys — so your site goes live smoothly, and every future update ships in minutes.
          </p>
          <ul className="ship__checks">
            <li>Global CDN hosting</li>
            <li>Automatic SSL &amp; backups</li>
            <li>Preview links for every change</li>
            <li>Analytics &amp; uptime alerts</li>
          </ul>
          <Button variant="ghost" icon="none" onClick={() => setRun((r) => r + 1)} disabled={!done}>
            {done ? "Run it again" : "Deploying…"}
          </Button>
        </div>

        <div ref={ref} className="terminal" role="img" aria-label="Animated deploy log: build checks pass and the site goes live.">
          <div className="terminal__bar" aria-hidden="true">
            <span className="frame__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="terminal__name">auvier — deploy</span>
          </div>
          <div className="terminal__body" aria-hidden="true">
            <p className="terminal__cmd">
              <span className="terminal__prompt">~/yourbrand</span> <span className="terminal__git">main</span>
              <span className="terminal__dollar">$</span> auvier deploy --prod
            </p>
            {shipLog.map((l, i) => (
              <p key={l.label} className={i < step ? "tline is-done" : i === step ? "tline is-run" : "tline"}>
                <span className="tline__icon">{i < step ? "✓" : <span className="spinner" />}</span>
                <span className="tline__label">{l.label}</span>
                <span className="tline__dots" />
                <span className="tline__detail">{l.detail}</span>
                <span className="tline__time">{DURATIONS[i].toFixed(1)}s</span>
              </p>
            ))}
            <div className={done ? "terminal__live is-on" : "terminal__live"}>
              <span className="terminal__live-dot" />
              <span>
                Live at <b>https://yourbrand.com</b>
              </span>
              <span className="terminal__total">done in {TOTAL}s</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
